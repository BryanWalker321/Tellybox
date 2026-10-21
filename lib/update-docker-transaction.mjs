import {cloneConfig,endpointConfig,disconnect,reconnect,healthcheck} from './docker-engine.mjs';
import {atomicJson} from './updates.mjs';

// This transaction changes application containers only. It never deletes, copies,
// renames or re-creates a station's persistent volumes or media files.
export class DockerTransaction {
  constructor(engine,paths,job,journal){Object.assign(this,{engine,paths,job,journal});}
  async save(){await atomicJson(this.paths.journal,this.journal);}
  async replace(old,image,labels,{agent=false}={}) {
    const {engine,job}=this;
    const name=old.Name.replace(/^\//,''),networks=endpointConfig(old);
    const step={oldId:old.Id,name,networks,newId:null,agent};
    this.journal.steps.push(step);await this.save();
    await engine.stop(old.Id);
    if((await engine.inspect(old.Id)).State?.Running)throw Error('The previous service could not be stopped.');
    await disconnect(engine,old,networks);
    await engine.call('POST','/containers/'+old.Id+'/rename?name='+encodeURIComponent(name+'-rollback-'+job.id.slice(0,8)));
    const config=cloneConfig(old,image,labels);
    if(agent)config.Healthcheck={Test:['NONE']};
    else config.Healthcheck=healthcheck(job.version,Number(old.Config.Env?.find(e=>e.startsWith('PORT='))?.slice(5)||4173));
    const result=await engine.call('POST','/containers/create?name='+encodeURIComponent(name),config);
    step.newId=result.Id;await this.save();
    await engine.call('POST','/containers/'+result.Id+'/start');
    if(!agent)await engine.health(result.Id);
    return result.Id;
  }
  async rollback(){
    if(!this.journal)return;
    if(this.journal.committed)return;
    for(const step of [...this.journal.steps].reverse()) {
      // Recover a crash after Docker created the replacement but before journalling its ID.
      if(!step.newId){
        const rows=await this.engine.call('GET','/containers/json?all=true');
        const candidate=rows.find(c=>c.Id!==step.oldId&&c.Names?.includes('/'+step.name));
        if(candidate){
          const c=await this.engine.inspect(candidate.Id);
          if(c.Config.Labels?.['io.tellybox.update-id']!==this.job.id)throw Error('A different container occupies the station name.');
          step.newId=c.Id;
        }
      }
      if(step.newId){
        // Volume removal is explicitly disabled, including during recovery.
        await this.engine.call('DELETE','/containers/'+step.newId+'?force=true&v=false').catch(async error=>{
          if(await this.engine.inspect(step.newId).catch(()=>null))throw error;
        });
      }
      const old=await this.engine.inspect(step.oldId);
      if(old.Name!=='/'+step.name)await this.engine.call('POST','/containers/'+step.oldId+'/rename?name='+encodeURIComponent(step.name));
      await reconnect(this.engine,step.oldId,step.networks);
      if(!old.State.Running)await this.engine.call('POST','/containers/'+step.oldId+'/start');
      if(!step.agent)await this.engine.health(step.oldId);
      else if(!(await this.engine.inspect(step.oldId)).State.Running)throw Error('The previous update service could not be restarted.');
    }
  }
}
