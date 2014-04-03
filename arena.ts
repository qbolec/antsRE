///<reference path="./task_template_executor.ts" />
///<reference path="./underscore/underscore.d.ts" />
class ArenaLib{
  public ant;
  constructor(public arena:Arena){}
  isWall(d){return !this.arena.canEnter( this.arena.translate(this.ant,d)); }
  friendsCount(d){
    var t=this.arena.translate(this.ant,d);
    return _.filter(this.arena.ants[this.ant.player],(ant)=>ant.row==t.row && ant.col==t.col).length;
  }
  enemiesCount(d){
    var t=this.arena.translate(this.ant,d);
    return _.filter(this.arena.ants[this.ant.player],(ant)=>ant.row==t.row && ant.col==t.col).length;
  }
  foodCount(d){
    var t=this.arena.translate(this.ant,d);
    return this.arena.isOnMap(t)?this.arena.map[t.row][t.col].food:0;
  }
  isMyBase(d){
    var t=this.arena.translate(this.ant,d);
    return this.arena.hatcheries[this.ant.player].row == t.row && this.arena.hatcheries[this.ant.player].col == t.col;
  }
  isEnemyBase(d){
    var t=this.arena.translate(this.ant,d);
    return this.arena.hatcheries[1-this.ant.player].row == t.row && this.arena.hatcheries[1-this.ant.player].col == t.col;
  }
  smellCommon(d){
    var t=this.arena.translate(this.ant,d);
    return this.arena.isOnMap(t)?this.arena.map[t.row][t.col].feromones[0]:0;
  }
  smellVisible(d){
    var t=this.arena.translate(this.ant,d);
    return this.arena.isOnMap(t)?this.arena.map[t.row][t.col].feromones[this.ant.player*2+2]:0;
  }
  smellHidden(d){
    var t=this.arena.translate(this.ant,d);
    return this.arena.isOnMap(t)?this.arena.map[t.row][t.col].feromones[this.ant.player*2+1]:0;
  }
  smellEnemy(d){
    var t=this.arena.translate(this.ant,d);
    return this.arena.isOnMap(t)?this.arena.map[t.row][t.col].feromones[(1-this.ant.player)*2+2]:0;
  }
}
class Arena{
  private executor = new TaskTemplateExecutor();
  private programs = [null,null];
  private terrain;
  public ants = [[],[]];
  public hatcheries = [];
  private frame = 0;
  public map = [];
  private lib :ArenaLib;
  constructor(source1,source2,terrain){
    this.lib = new ArenaLib(this);

    _.each([source1,source2],(source,idx)=>{
      try{
        this.executor.infereType(source);
        this.programs[idx]=this.executor.compile_and_link(source,this.lib);
      }catch(e){
      }
    });
    var textMap = _.compact(_.map(terrain.split('\n'),function(line){return line.replace(/\s/g,'')}));
    _.each(textMap,(text,row)=>{
      var mapRow=[];
      for(var col=0;col<text.length;++col){
        var symbol = text.charAt(col);
        mapRow.push({
          row:row,
          col:col,
          wall: symbol=='#',
          feromones:[0,0,0,0,0],
          food: '0'<= symbol && symbol <= '9' ? +symbol : 0,
          hatchery: null,
          pickQueue:[[],[]],
          sprayQueue:[[],[]],
        });
      }
      this.map.push(mapRow);
    });

    _.each(['a','b'],(symbol,idx)=>{
      _.each(textMap,(text,row)=>{
        var col = text.indexOf(symbol);
        if(0<=col){
          this.map[row][col].hatchery = this.hatcheries[idx] = {
            col:col,
            row:row,
            food:3,
            producing:0,
            score:0,
            player:idx,
          }
        }
      });
    });
  }
  translate(position,direction){
    var deltaRow=[0,-1,0,1, 0];
    var deltaCol=[0, 0,1,0,-1];
    return {
      row: position.row+deltaRow[direction],
      col: position.col+deltaCol[direction]
    };
  }
  isOnMap(position){
    return 0<=position.row && 0<=position.col && position.row<this.map.length && position.col < this.map[position.row].length;
  }
  canEnter(position){
    return this.isOnMap(position) && !this.map[position.row][position.col].wall;
  }
  nextFrame(){
    if(this.frame < 10000){
      this.frame++;
      _.each(this.hatcheries,(hatchery,idx)=>{
        if(hatchery.food>0 && hatchery.producing==0){
          hatchery.food--;
          hatchery.producing = 3;
        }else if(hatchery.producing>1){
          hatchery.producing--;
        }else if(hatchery.producing==1){
          hatchery.producing=0;
          this.ants[idx].push({
            row:hatchery.row,
            col:hatchery.col,
            hormones:{r:0,g:0,b:0},
            food:0,
            player:idx,
          });
        }
      });
      var clip = (range,x)=>{return Math.round(Math.max(0,Math.min(range,x)));};
      _.each(this.ants,(ants,idx)=>{
        _.each(ants,(ant)=>{
          if(this.programs[idx]!==null){
            this.lib.ant = ant; //zmiana globalnego kontekstu biblioteki na bieżącą mrówkę
            var decission = this.programs[idx](_.extend({food:!!ant.food},ant.hormones));
            ant.hormones = {
              r: clip(255,decission.hormones.r),
              g: clip(255,decission.hormones.g),
              b: clip(255,decission.hormones.b),
            };
            ant.action = decission.action;
            switch(ant.action.type){
              case 'pass':
                break;
              case 'move':
                var direction = clip(4,ant.action.direction);
                var moved = this.translate(ant,direction);
                if(direction && this.canEnter(moved)){
                  ant.action = {type:'move', destination: moved};
                }else{
                  ant.action = {type:'pass'};
                }
                break;
              case 'drop':
                if(0==ant.food){
                  ant.action = {type:'pass'};
                }
                break;
              case 'pick':
                if(0<ant.food || 0==this.map[ant.row][ant.col].food){
                  ant.action = {type:'pass'};
                }else{
                  this.map[ant.row][ant.col].pickQueue[ant.player].push(ant);
                }
                break;
              case 'spray':
                if(ant.action.feromon=='common'){
                  this.map[ant.row][ant.col].sprayQueue[ant.player].push(ant);
                }
                break;
              default:
                ant.action = {type:'pass'};
                console.log('unknown action',decission);
            }
          }else{
            ant.action = {type:'pass'};
          }
        });
      });
      _.each(this.map,(mapRow,row)=>{
        _.each(mapRow,(cell,col)=>{
          var fighting = Math.min(cell.pickQueue[0].length,cell.pickQueue[1].length);
          _.each(cell.pickQueue, (ants,idx)=>{
            _.each(ants.slice(fighting), (ant)=>{
              if(0<cell.food && 0==ant.food){
                ++ant.food;
                --cell.food;
              }
            });
          });
          cell.pickQueue=[[],[]];
          var fighting = Math.min(cell.sprayQueue[0].length,cell.sprayQueue[1].length);
          _.each(cell.sprayQueue, (ants,idx)=>{
            _.each(ants.slice(fighting), (ant)=>{
              cell.feromones[0] = clip(255,ant.action.density);
            });
          });
          cell.sprayQueue=[[],[]];
        });
      });
      _.each(this.ants,(ants,idx)=>{
        _.each(ants,(ant)=>{
          switch(ant.action.type){
            case 'move':
              ant.row=ant.action.destination.row;
              ant.col=ant.action.destination.col;
              break;
            case 'drop':
              if(this.map[ant.row][ant.col].hatchery){
                this.map[ant.row][ant.col].hatchery.food+=ant.food;
                this.map[ant.row][ant.col].hatchery.score+=ant.food;
              }else{
                this.map[ant.row][ant.col].food+=ant.food;
              }
              ant.food=0;
              break;
            case 'spray':
              if(ant.action.feromon!='common'){
                this.map[ant.row][ant.col].feromones[idx*2+ (ant.action.feromon=='hidden'?1:2)] = ant.action.density;
              }
              break;
          }
        });
      });
    }
    return {map:this.map,frame:this.frame,hatcheries:this.hatcheries,ants:this.ants};
  }
}
