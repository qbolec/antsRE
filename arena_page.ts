///<reference path="../jst/arena_page.ts" />
///<reference path="./page.ts" />
///<reference path="./arena.ts" />
class ArenaPageView extends Backbone.View{
  model:ArenaPage;
  context:CanvasRenderingContext2D;
  config={
    width:800,
    height:600,
  };
  className(){
    return "arena_page";
  }
  events(){
    return {
      'click button.run' : ()=>{this.trigger('run');}
    };
  }
  initialize(){
    this.listenTo(this.model,'change:frame',(model,frame)=>{
      this.context.fillStyle = 'white';
      this.context.fillRect(0, 0, this.config.width, this.config.height);
      if(frame!==null){
        var rowsCount = frame.map.length;
        var columnsCount = frame.map[0].length;
        var squareSize = Math.min(this.config.height/rowsCount,this.config.width/columnsCount);
        this.context.fillStyle = '#11DD22';
        this.context.fillRect(0, 0, columnsCount*squareSize, rowsCount*squareSize);
        _.each(frame.map,(mapRow,row)=>{
          _.each(mapRow,(cell,col)=>{
            if(cell.wall){
              this.context.fillStyle = 'gray';
              this.context.fillRect(squareSize*col, squareSize*row, squareSize, squareSize);
            }else if(cell.hatchery){
              this.context.fillStyle = cell.hatchery.player ? '#0000BB':'#BB0000';
              this.context.fillRect(squareSize*col, squareSize*row, squareSize, squareSize);
            }else if(cell.food){
              var food = Math.min(cell.food,9);
              this.context.fillStyle = 'yellow';
              this.context.fillRect(squareSize*(col+(1-food/9)*.5), squareSize*(row+(1-food/9)*.5), squareSize*(food/9), squareSize*(food/9));
            }
          });
        });
        var taken = {};
        _.each(frame.ants,(ants,playerIdx)=>{
          _.each(ants,(ant)=>{
            var hash = ant.col + '_' + ant.row;
            var slot=Math.min(taken[hash]||0,24);
            taken[hash]=slot+1;
            this.context.strokeStyle = playerIdx ? '#0000FF':'#FF0000';
            var r= ant.hormones.r;
            var g= ant.hormones.g;
            var b= ant.hormones.b;
            this.context.fillStyle = 'rgb(' + r + ',' + g + ',' + b +  ')';
            this.context.lineWidth = 2;
            this.context.beginPath();
            this.context.arc((ant.col+.1+Math.floor(slot/5)*0.2 )*squareSize, (ant.row+.1+Math.floor(slot%5)*0.2)*squareSize, squareSize*0.1, 0, 2 * Math.PI, false);
            this.context.closePath();
            this.context.stroke();
            this.context.fill();
          });
        });
        _.each(frame.map,(mapRow,row)=>{
          _.each(mapRow,(cell,col)=>{
            _.each(['#F0F','#F00','#800','#00F','#008'],(color,i)=>{
              if(cell.feromones[i]){
                this.context.fillStyle = color;
                this.context.fillText(cell.feromones[i],col*squareSize,(row+i*0.2)*squareSize);
              }
            });
          });
        });
        _.each(['player1','player2'],(name,idx)=>{
          this.$('.score .' + name).text(frame.hatcheries[idx].score);
          this.$('.food .' + name).text(frame.hatcheries[idx].food);
          this.$('.ants .' + name).text(frame.ants[idx].length);
        });

      }

    });
    this.listenTo(this.model,'change:players',(model,players)=>{
      _.each(['player1','player2'],(classname)=>{
        var select = this.$('select.' + classname);
        select.empty();
        _.each(players,(player)=>{
          var option = $('<option></option>');
          option.attr('value',player.source);
          option.text(player.name);
          select.append(option);
        });
      });
    });
    this.listenTo(this.model,'change:maps',(model,maps)=>{
      var select = this.$('select.map');
      select.empty();
      _.each(maps,(map)=>{
        var option = $('<option></option>');
        option.attr('value',map.terrain);
        option.text(map.name);
        select.append(option);
      });
    });
  }
  render(){
    this.$el.html(Templates.get('arena_page')(this.model.toJSON()));

    var elem=<HTMLCanvasElement>this.$('canvas')[0];
    elem.width = this.config.width;
    elem.height = this.config.height;
    this.context = elem.getContext('2d');
    return this;
  }
}
class ArenaPage extends Page {
  view:ArenaPageView;
  timerHandle = null;
  defaults(){
    return {
      players:[],
      maps:[],
      arena:null,
      frame:null,
    }
  }
  run(){
    var source1 = (<HTMLInputElement>this.view.$('select.player1')[0]).value;
    var source2 = (<HTMLInputElement>this.view.$('select.player2')[0]).value;
    var terrain = (<HTMLInputElement>this.view.$('select.map')[0]).value;
    var arena = new Arena(source1,source2,terrain);
    this.set('arena',arena);
  }
  nextFrame(){
    var arena = this.get('arena');
    if(arena!==null){
      this.set('frame',arena.nextFrame());
    }else{
      this.set('frame',null);
    }
    _.delay(()=>this.trigger('nextFrame'), 1000/+(<HTMLInputElement>this.view.$('input.fps')[0]).value);
  }
  quit(){
    clearInterval(this.timerHandle);
  }
  initialize(){
    this.view = new ArenaPageView({model:this});
    this.view.render();
    app.api.getMaps({
      success:(maps)=>{
        this.set('maps',maps);
      }
    });
    app.api.getPlayers({
      success:(players)=>{
        this.set('players',players);
      }
    });

    this.listenTo(this.view,'run',this.run);
    this.listenTo(this,'nextFrame',this.nextFrame);
    this.trigger('nextFrame');
  }
}
