// Original G1 mosaics: the same six-pixel cells are displayed on web and VBIT.
export function mosaicRow(pixels,colour='cyan'){
 const cells=[];for(let x=0;x<76;x+=2){let bits=0;for(let y=0;y<3;y++)for(let dx=0;dx<2;dx++)if(pixels[y]?.[x+dx])bits|=1<<(y*2+dx);cells.push(bits);}
 return {text:'',colour,mosaic:cells};
}
export function beachRows(){
 return Array.from({length:8},(_,r)=>mosaicRow(Array.from({length:3},(_,dy)=>Array.from({length:76},(_,x)=>{
  const y=r*3+dy;
  if(y<10)return (x-60)**2+(y-5)**2<22||y===9;
  if(y<18)return (x+3*y)%19<13;
  return true;
 })),r<3?'yellow':r<6?'cyan':'yellow'));
}
// Schematic Great Britain and Northern Ireland outline on a 76 by 27 grid.
const outline=[[37,0],[46,1],[44,4],[48,7],[44,10],[49,13],[48,17],[54,20],[58,23],[53,25],[37,26],[31,25],[37,23],[39,20],[35,19],[37,16],[39,15],[37,12],[39,10],[34,8],[37,5],[33,4]];
function inside(x,y){let hit=false;for(let i=0,j=outline.length-1;i<outline.length;j=i++){const a=outline[i],b=outline[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit||(x>=27&&x<=33&&y>=12&&y<=15);}
export function ukMapRows(){return Array.from({length:9},(_,r)=>mosaicRow(Array.from({length:3},(_,dy)=>Array.from({length:76},(_,x)=>inside(x,r*3+dy))),'green'));}
