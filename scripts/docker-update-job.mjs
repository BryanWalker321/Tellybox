import {rm} from 'node:fs/promises';
import {DockerEngine,sameData,healthcheck} from '../lib/docker-engine.mjs';
import {DockerTransaction} from '../lib/update-docker-transaction.mjs';
import {updatePaths,readJson,registry,validateManifest} from '../lib/updates.mjs';
import {writeProgress,wait} from '../lib/update-native.mjs';
const paths=updatePaths(process.env.DATA_DIR||'/app/data'),engine=new DockerEngine(),job=await readJson(paths.active);
async function disableRestart(){const name=process.env.TELLYBOX_UPDATE_CONTAINER_NAME;if(name&&/^tellybox-update-[a-f0-9-]+$/.test(name))await engine.call('POST','/containers/'+name+'/update',{RestartPolicy:{Name:'no'}});}
if(!job){await disableRestart();process.exit(0);}
validateManifest(job.manifest,job.version);
const journal=await readJson(paths.journal);
const transaction=new DockerTransaction(engine,paths,job,journal);
let probe,retainRecovery=false;
async function finishCleanup(){for(const step of transaction.journal?.steps||[])await engine.remove(step.oldId);}
async function cleanupProbes(){const filters=encodeURIComponent(JSON.stringify({label:['io.tellybox.update-probe='+job.id,'io.tellybox.update-project='+process.env.TELLYBOX_UPDATE_PROJECT]}));const rows=await engine.call('GET','/containers/json?all=true&filters='+filters);for(const row of rows)await engine.remove(row.Id);}
try {
  await cleanupProbes();
  if(journal?.committed){await writeProgress(paths,job,'completed',100,'Update installed. Your media, channels and schedules have been retained.');await finishCleanup();}
  else if(process.env.TELLYBOX_UPDATE_RECOVER==='1'||journal){
    await transaction.rollback();
    await writeProgress(paths,job,'failed',0,'The update was interrupted. The previous application version has been restored; station data was retained.');
  } else {
    const [app,agent,image]=await Promise.all([engine.inspect(job.oldApp),engine.inspect(job.oldAgent),engine.call('GET','/images/'+encodeURIComponent(job.imageId)+'/json')]);
    const project=process.env.TELLYBOX_UPDATE_PROJECT;
    for(const [container,service] of [[app,'tellybox'],[agent,'updater']]){
      if(container.Config.Labels?.['com.docker.compose.project']!==project||container.Config.Labels?.['com.docker.compose.service']!==service)throw Error('Invalid update target.');
    }
    if(!sameData(app,agent)||!app.Config.Image.startsWith(registry)||image.Config?.Labels?.['org.opencontainers.image.revision']!==job.manifest.commit||image.Config?.Labels?.['org.opencontainers.image.version']!==job.version)throw Error('Invalid update target.');
    await writeProgress(paths,job,'verifying',55,'Checking the new version before restarting your station.');
    const checked=await engine.call('POST','/containers/create?name=tellybox-check-'+job.id.slice(0,8),{
      Image:image.Id,Env:['HOST=0.0.0.0','PORT=4173'],Healthcheck:healthcheck(job.version),Labels:{'io.tellybox.update-probe':job.id,'io.tellybox.update-project':project},
      HostConfig:{Tmpfs:{'/app/data':'rw,nosuid,size=67108864,mode=1777','/app/media':'rw,nosuid,size=67108864,mode=1777'}}
    });
    probe=checked.Id;await engine.call('POST','/containers/'+probe+'/start');await engine.health(probe);await engine.remove(probe);probe=null;
    transaction.journal={id:job.id,steps:[],committed:false};await transaction.save();
    const labels={...image.Config.Labels,'io.tellybox.update-id':job.id};
    await writeProgress(paths,job,'restarting',80,'Restarting Tellybox. Your media and saved station settings stay in place.');
    await transaction.replace(app,job.manifest.image,labels);
    await writeProgress(paths,job,'restarting',92,'Finishing the update service restart.');
    const started=Date.now();await transaction.replace(agent,job.manifest.image,labels,{agent:true});
    let ready=false;
    for(let i=0;i<40;i++){const state=await readJson(paths.agent);if(state?.version===job.version&&Date.parse(state.at)>=started){ready=true;break;}await wait(500);}
    if(!ready)throw Error('Update service did not restart.');
    // Persist the commit before disposing of rollback containers. Recovery after
    // this point finishes cleanup and never tries to resurrect deleted containers.
    transaction.journal.committed=true;await transaction.save();
    await writeProgress(paths,job,'completed',100,'Update installed. Your media, channels and schedules have been retained.');
    await finishCleanup();
  }
} catch {
  if(transaction.journal?.committed){
    // The working version was already committed; retry final bookkeeping rather
    // than falsely reporting that the old application was restored.
    retainRecovery=true;
    process.exitCode=1;
  } else {
  try {
    await transaction.rollback();
    await writeProgress(paths,job,'failed',0,transaction.journal?.steps.length?'The new version could not be installed. The previous application version has been restored; station data was retained.':'The update could not be prepared. Your current version and station data are unchanged.');
  } catch {
    retainRecovery=true;
    await writeProgress(paths,job,'recovery-needed',0,'Automatic recovery could not finish. Your media and station volumes have been retained. Restart the managed updater to retry recovery.');
  }
  }
} finally {
  if(probe)await engine.remove(probe);
  if(!retainRecovery){await disableRestart();await rm(paths.journal,{force:true});await rm(paths.active,{force:true});}
  else if(!transaction.journal?.committed)await disableRestart();
}
