import {createOwner} from '/owner.mjs';

const controls=createOwner({onCatalogue:async catalogue=>{
 const name=catalogue.brand.name;
 document.getElementById('admin-network').textContent=name;
 document.title=`Station control room · ${name}`;
}});
await controls.open();
