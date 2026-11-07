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

// The index television uses the same geometric shapes as the website's SVG.
export function televisionRows(){
 const pixel=(x,y)=>{let c='black';const rect=(a,b,w,h)=>x>=a&&x<a+w&&y>=b&&y<b+h;if(rect(0,20,32,4)||rect(3,4,26,16))c='yellow';if(rect(5,6,20,12))c='blue';if(rect(7,8,16,8))c='cyan';if(rect(9,8,12,8)||rect(7,20,4,2)||rect(23,20,4,2))c='black';if(rect(11,10,3,4)||rect(17,10,3,4)||rect(27,8,2,2)||rect(27,12,2,2))c='white';return c;};
 return Array.from({length:3},(_,r)=>Array.from({length:8},(_,x)=>{const colours=Array.from({length:6},(_,b)=>pixel((x*2+b%2)*2+1,(r*3+Math.floor(b/2)+.5)*24/9));const colour=r===1?'cyan':'yellow';return {colour,mosaic:[colours.reduce((bits,c,i)=>bits|(c!=='black'?1<<i:0),0)]};}));
}

const smallFont={'0':'111101101101111','1':'010110010010111','2':'110001010100111','3':'110001010001110','4':'101101111001001','5':'111100110001110','6':'011100111101111','7':'111001010010010','8':'111101111101111','9':'111101111001110','&':'010101010101011','-':'000000111000000','.':'000000000000010','!':'010010010000010',A:'010101111101101',B:'110101110101110',C:'111100100100111',D:'110101101101110',E:'111100110100111',F:'111100110100100',G:'111100101101111',H:'101101111101101',I:'111010010010111',J:'001001001101111',K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'101111111111101',O:'111101101101111',P:'110101110100100',Q:'111101101111001',R:'110101110101101',S:'111100111001111',T:'111010010010010',U:'101101101101111',V:'101101101101010',W:'101101111111101',X:'101101010101101',Y:'101101010010010',Z:'111001010100111'};
export function mastheadRows(brand){
 const title=String(brand).slice(0,13).toUpperCase(),glyph=x=>smallFont[title[Math.floor(x/4)]]||'000000000000000';
 const bits=(fn,x,r)=>Array.from({length:6},(_,i)=>fn(x*2+i%2,r*3+Math.floor(i/2))?1<<i:0).reduce((a,b)=>a|b,0);
 return Array.from({length:2},(_,r)=>({logo:Array.from({length:5},(_,x)=>bits((px,y)=>y===0||y===5||px===0||px===9||px>=1&&px<=3&&['111','010','010','010'][y-1]?.[px-1]==='1'||px>=5&&px<=7&&['110','101','110','101'][y-1]?.[px-5]==='1',x,r)),title:Array.from({length:Math.ceil(title.length*4/2)},(_,x)=>bits((px,y)=>y<5&&px%4<3&&glyph(px)[y*3+px%4]==='1',x,r))}));
}

// Native G1 rendering derived from the same owner-supplied quiz artwork.
export const quizPortrait=[{"colour":"white","mosaic":[0,0,0,0,48,12,12,12,12,48,16,0]},{"colour":"yellow","mosaic":[0,0,0,8,33,48,48,56,62,20,2,16]},{"colour":"yellow","mosaic":[0,0,0,0,60,42,63,63,22,53,0,17]},{"colour":"yellow","mosaic":[0,0,0,0,31,6,63,63,15,23,44,31]},{"colour":"yellow","mosaic":[0,0,0,42,13,13,51,49,13,58,30,0]},{"colour":"yellow","mosaic":[0,32,48,18,47,61,60,60,62,31,33,0]},{"colour":"blue","mosaic":[32,63,53,45,48,0,51,19,3,48,49,0]},{"colour":"blue","mosaic":[62,63,63,2,63,0,63,61,40,63,63,0]}];
