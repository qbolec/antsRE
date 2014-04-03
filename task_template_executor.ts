///<reference path="./tex.ts" />
///<reference path="./sexp.d.ts" />
///<reference path="./polish_bundle.ts" />
///<reference path="./underscore/underscore.d.ts" />
class TaskTemplateExecutor{
  private parse(source){
    return sexp.parse(source);
  }
  public infereType(source){
    var ast = this.parse(source);
    ast = {
      type : 'apply',
      foo : ast,
      arg : {type: 'tupple', fields: _.map(['r','g','b'],(name)=>{return {
        key:name,
        value:{type:'literal',start:ast.start,end:ast.end,value:1}
      }}).concat(<any>{
        key:'food',
        value:{type:'literal',start:ast.start,end:ast.end,value:false}        
      }) , start : ast.start,  end:ast.end},
      start : ast.start,
      end : ast.end,
    }
    return this.infereAstType(ast);
  }
  public infereAstType(ast){
    var action = new sexp.BaseType('action');
    var number = new sexp.BaseType('number');
    var string = new sexp.BaseType('string');
    var boolean = new sexp.BaseType('boolean');
    var numberToBoolean = new sexp.FunctionType(number,boolean);
    var numberToAction = new sexp.FunctionType(number,action);
    var numberToString = new sexp.FunctionType(number,string);
    var numberToNumber = new sexp.FunctionType(number,number);
    var numberToNumberToNumber = new sexp.FunctionType(number,numberToNumber);
    var bottom = new sexp.BottomType();
    var type = ( sexp.infereType(ast,{
      'pass' : action,
      'move' : numberToAction,
      'pick' : action,
      'drop' : action,
      'sprayCommon' : numberToAction,
      'sprayVisible' : numberToAction,
      'sprayHidden' : numberToAction,
      'isWall' : numberToBoolean,
      'friendsCount' : numberToNumber,
      'enemiesCount' : numberToNumber,
      'foodCount' : numberToNumber,
      'isMyBase' : numberToBoolean,
      'isEnemyBase' : numberToBoolean,
      'smellCommon'  : numberToNumber,
      'smellVisible'  : numberToNumber,
      'smellHidden'  : numberToNumber,
      'smellEnemy'  : numberToNumber,

      'HERE' : number,
      'UP' : number,
      'DOWN' : number,
      'RIGHT' : number,
      'LEFT' : number,
      'E' : number,
      'PI' : number,
      'ln' : numberToNumber,
      'log' : numberToNumberToNumber,
      'abs' : numberToNumber,
      'ceil' : numberToNumber,
      'floor' : numberToNumber,
      'round' : numberToNumber,
      'sgn' : numberToNumber,
      'cos' : numberToNumber,
      'acos' : numberToNumber,
      'sin' : numberToNumber,
      'sqrt' : numberToNumber,
      'asin' : numberToNumber,
      'tan' : numberToNumber,
      'atan' : numberToNumber,
      'pow' : numberToNumberToNumber,
      'atan2' : numberToNumberToNumber,
      'min' : numberToNumberToNumber,
      'max' : numberToNumberToNumber,
      'gcd' : numberToNumberToNumber,
      'lcm' : numberToNumberToNumber,
      'raise' : new sexp.FunctionType(new sexp.BaseType('string'),bottom),
    }));

    var t = <any>type;
    var arg_no = 0;
    if(t.type != 'tupple'){
      throw new TypeError("Unexepcted type of whole program - " + type + ". It should be a function which returns a tupple.");
    }

    if(!t.hasField('action')){
      throw new TypeError("Missing 'action' field in the tupple returned from the program");
    }
    var actionType = t.getField('action');
    if(actionType.type != 'base' || actionType.name != 'action'){
      throw new TypeError("Expected 'action' to be an action, but it is " + actionType);
    }
    if(!t.hasField('hormones')){
      throw new TypeError("Missing 'hormones' field in the tupple returned from the program");
    }
    var hormonesType = t.getField('hormones');
    if(hormonesType.type != 'tupple'){
      throw new TypeError("Expected 'hormones' to be a tupple, but it is " + hormonesType);
    }
    var letters = ['r','g','b'];
    hormonesType.forTypeField((t,f)=>{
      if(_.contains(letters,f)){
        if(t.type != 'base' || t.name != 'number'){
          throw new TypeError("Expected " + f + " in 'hormones' to be a number, but it is " + t);
        }
      }else{
        throw new TypeError("Unexpected field " + f + " in 'hormones'");
      }
    });
    _.each(letters,(letter)=>{
      if(!hormonesType.hasField(letter)){
        throw new TypeError("Expected to see field " + letter + " in 'hormones'");
      }
    });

    return type;
  }
  public compile_and_link(source, lib){
    var UserDefinedException = function(message){
       this.message = message;
    }
    UserDefinedException.prototype.name = "UserDefinedException";
    UserDefinedException.prototype.toString = function(){return this.name + ": "+ this.message};
    var ast = this.parse(source);

    var clip = (range,x)=>{return Math.round(Math.max(0,Math.min(range,x)));};
    return (<any>sexp.link(sexp.compile(ast),{
        'pass' : {type:'pass'},
        'move' : function(d){return {type:'move',direction:d}},
        'pick' : {type:'pick'},
        'drop' : {type:'drop'},
        'sprayCommon' : function(d){return {type:'spray',feromon:'common',density:clip(255,d)}},
        'sprayVisible' : function(d){return {type:'spray',feromon:'visible',density:clip(255,d)}},
        'sprayHidden' : function(d){return {type:'spray',feromon:'hidden',density:clip(255,d)}},

        'isWall' : function(d){return lib.isWall(clip(4,d));},
        'friendsCount' : function(d){return lib.friendsCount(clip(4,d));},
        'enemiesCount' : function(d){return lib.enemiesCount(clip(4,d));},
        'foodCount' : function(d){return lib.foodCount(clip(4,d));},
        'isMyBase' : function(d){return lib.isMyBase(clip(4,d));},
        'isEnemyBase' : function(d){return lib.isEnemyBase(clip(4,d));},
        'smellCommon'  : function(d){return lib.smellCommon(clip(4,d));},
        'smellVisible'  : function(d){return lib.smellVisible(clip(4,d));},
        'smellHidden'  : function(d){return lib.smellHidden(clip(4,d));},
        'smellEnemy'  : function(d){return lib.smellEnemy(clip(4,d));},

        'HERE' : 0,
        'UP' : 1,
        'DOWN' : 3,
        'RIGHT' : 2,
        'LEFT' : 4,
        'E' : Math.E,
        'PI' : Math.PI,
        'ln' : function(a){if(a<=0){throw new UserDefinedException("Zły argument dla ln");}return Math.log(a);},
        'log' : function(a){return function(b){if(a<=0 || b<=0 || b==1){throw new UserDefinedException("Zły argument dla log");};return Math.log(b)/Math.log(a);}},
        'abs' : Math.abs,
        'ceil' : Math.ceil,
        'floor' : Math.floor,
        'round' : Math.round,
        'sgn' : function(x){return x>0?1:(x<0?-1:0);},
        'cos' : Math.cos,
        'acos' : Math.acos,
        'sin' : Math.sin,
        'sqrt' : function(a){if(a<0){throw new UserDefinedException("Zły argument dla sqrt");}return Math.sqrt(a);},
        'asin' : Math.asin,
        'tan' : Math.tan,
        'atan' : Math.atan,
        'pow' : function(a){return function(b){return Math.pow(a,b);}},
        'atan2' : function(a){return function(b){return Math.atan2(a,b);}},
        'min' : function(a){return function(b){return Math.min(a,b);}},
        'max' : function(a){return function(b){return Math.max(a,b);}},
    }))();
  }

}
