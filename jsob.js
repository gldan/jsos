
;var jsob = function(){


function BStream(buffer){

    //数据
    this.bytes = buffer||[0];
    //数据光标索引
    this.i = 0;
    //对应字节的位的索引
    this.bi = 0;

}

BStream.prototype = {
    constructor:BStream,
    //写入结束，最后一个字节的位补齐0
    writeEnd:function(){ if(this.bi!==0)this.writeBit(0,this.br); return this},

    readEnd:function(){ if(this.bi!==0)this.readBit(this.br); return this},

    clearIdx:function(){
        this.i = 
        this.bi = 0;
    },

    getBuffer(){
        return this.bytes
    },

    //写入一个流
    writeStream:function( stream ){
        var buffer = stream.getBuffer();
        for(var i=0,l=buffer.length;i<l;i++)
        this.writeBit(buffer[i],8);
        return this;
    },

    //data 数据，可能是一个字节或者是一个数组，bits 是写入的位数
    writeBit:function( data, bits ){

        if(bits<1)return;

        var rem =  this.br , byt = this.bytes[this.i] ;
        
        // return;
        // console.log(rem)

        if(   rem >= bits   ){

            data = data&BStream.andZD[bits];
            this.bytes[ this.i ] = (byt<<bits) | data;
            this.bi += bits;

            if(this.br<=0){
                this.i ++;
                this.bi = 0;
            }

        }else{

            var diff = bits - rem, tmp = (data>>diff) & BStream.andZD[rem];
            //写入当前光标剩余bit
            this.writeBit( tmp, rem );
            //再次写入未写入的bit
            this.writeBit( data&BStream.andZD[diff] , diff );
        }
    },
     //需要读取的位数
    readBit:function( bits ){

        if(bits<1)return;

        bits = bits || 1;
        var rem =  this.br,
        byt = this.bytes[this.i],
        tmp ;

        if( rem >= bits ){

            tmp = rem - bits;
            this.bi+=bits;
            if(this.br<=0){
                this.i ++;
                this.bi = 0;
            }
            return (byt>>tmp) & BStream.andZD[ bits ]
        }else{
            return  ( this.readBit( rem ) << ( tmp = bits - rem ) ) | this.readBit( tmp ); 
        }
    },

    writeString:function( s ){

        for(var i=0,l=s.length;i<l;i++){
            this.writeChar(s[i]);
        }

    },

    readString:function(length){
        var s = [];
        while(length-->0)s.push(this.readChar());
        return s.join('');
    },

    writeChar:function( s ){

        return this.writeAutoNum(s.charCodeAt(0));

    },

    readChar:function(){
        return String.fromCharCode(this.readAutoNum())
    },

    //自适应字节型大小
    writeAutoNum:function( num ){

        var t ,b = [],t1,w,s;
        if( num>BStream.BIGNUM ){

            s = num.toString(2);
            w = Math.ceil(s.length/7);
          
            t1 = s.length%7;
            if(t1){
                this.writeBit( parseInt( s.substr(0,t1), 2 ) , 8 );
                b.push(parseInt( s.substr(0,t1), 2 ))
            }else{

                t1=7;
                this.writeBit( parseInt( s.substr(0,7), 2 ) , 8 );
                b.push(parseInt( s.substr(0,7), 2 ))
            }

            for(var i=0,l=w-1;i<l;i++){

                t = parseInt( s.substr(i*7+t1,7),2 );
                this.writeBit( i>=l-1 ? 128|t : t, 8 );
                b.push(  i>=l-1 ? 128|t : t )
            }

            return;

        }

        w = Math.ceil(BStream.getpow2(num)/7);
        
        if(w){
            while(w--){
                t = (num>> (w*7))&BStream.andZD[7];
                this.writeBit( w?t:t|128 , 8 );
                b.push(w?t:t|128)
            }

        }else{

            this.writeBit( t|128 , 8 );
            b.push( t|128)
        }

        return this
    },
    readAutoNum:function(){
        var i = 0, tmp , num = 0;
        var ji =0,f1=null, t2 ,t1;
        var isbig = false;//是否是大数
        var bigs = ''; // 大数使用字符串处理，避免位移出错
        while(1){
            ji++;
            tmp = this.readBit( 8 );
            if(f1===null)f1=BStream.getpow2(tmp);
            
            if( !isbig&&ji>=5){
                if(f1>=4||ji>5)isbig = true;
                bigs = num.toString(2);
            }

            if(isbig){

                t1 = tmp&127;
                t2 = BStream.getpow2(t1);

                if(t2<7){
                    bigs += (f1= BStream.ss(7-t2,'0') + t1.toString(2) );
                }else{
                    bigs += t1.toString(2);
                }
                
            }else{

                num = (num<<7) | (tmp&BStream.andZD[7]);
            }

            if( tmp>>7)break;

        }
        return isbig?parseInt(bigs,2):num;
    },

// 自适应短型数字
// 4位 0 取4位表示指数 +- 8    1-8
// 8位 10 取6位表示指数 +-32  9-72
// 8位 11 1|0  取5位加自定义长度表示  
// 8位 取8位  
//us(boolean) = 是否负数, 是否从0开始

    _writeBigShortNum:function( num, us, zero ){

        var _num = Math.abs(num),w,st=0,jian;
        var t 
        var s;
        var ws = 0;
        
        if(us){

            t = _num;
            s = t.toString(2);
            w = Math.ceil( (BStream.getpow2(t)-5)/7 );
            jian = 7*w - s.length ;

            if(jian>=0){
                // var x1 = parseInt((num<0?'1111':'1110'))
                this.writeBit(num<0?224:192,8);
                ws = 7-jian;

            }else{

                this.writeBit(
                    parseInt( (num<0?'111':'110') + BStream.ss('0',5+jian) + s.substr(0,st = Math.abs(jian)),2 ),
                    8 );
                ws = 7;

            }

            for(var i=0,l=w;i<l;i++){

                t = parseInt( s.substr(i*7+st,ws),2 );

                // t = parseInt( s.substr(i*7+st,7),2 );
                this.writeBit( i>=l-1 ? 128|t : t, 8 );
                if(ws!==7){
                    ws =7;
                    st = -jian;
                }
            }

        }else{

            t = _num;
            s = t.toString(2);
            w = Math.ceil( (BStream.getpow2(t)-6)/7 );
            jian = 7*w - s.length ;

            ws = 0;
            var b = [];
            if(jian>=0){
                
                this.writeBit(192,8);
                ws = 7-jian;

            }else{

                this.writeBit(
                    parseInt( '11' + BStream.ss('0',6+jian) + s.substr(0,st = Math.abs(jian)),2 ),
                    8 );
                ws = 7;
            }

            for(var i=0,l=w;i<l;i++){

                t = parseInt( s.substr(i*7+st,ws),2 );
                this.writeBit( i>=l-1 ? 128|t : t, 8 );
               
                if(ws!==7){
                    ws =7;
                    st = -jian;
                }
            }
        }

        return  this 
    },

    writeShortNum:function( num, us, zero ){

        var _num = Math.abs( num ), t =_num;

        if(_num> BStream.BIGNUM ){
            return this._writeBigShortNum(num, us, zero)
        }


        if(us){

             //正负 0-3
            if( _num <= 3){

                this.writeBit( (num<0 ? 4:0) | (_num) , 4 )
            // 4 - 35
           }else if( _num <=  34 ){

                 this.writeBit( (num<0 ?160:128) | (_num-3) , 8 )

           }else{

                us =   Math.ceil(  ( BStream.getpow2(t) - 5) / 7 ); 

                this.writeBit( (num<0?224:192) | (31&(t >> ( us*7 )) ) , 8 );

                while( us-- ){
                        this.writeBit( 127&(t>>(us*7) )|(us?0:128) ,8);
                }
           }


        }else{

             //0-7
           if( _num <= 7){
                this.writeBit( _num , 4 )
            // 8 - 70
           }else if( _num <=  70 ){
                this.writeBit( (_num-7)|128 , 8 )
           // 71-
           }else{

                us =   Math.ceil(  ( BStream.getpow2(t) - 6) / 7 ); 

                this.writeBit( 63&( t >> ( us*7 ) )|192, 8 );

                while( us-- ){
                    this.writeBit( 127&(t>>(us*7)  )|(us?0:128) ,8);
                }
           }
        }
    },

    readShortNum:function( us ){

        var t =null,t1,t2,t3,t4;
        var re ;

        //记录游标
        var _i = this.i, _bi = this.bi ;
        var ji=0;
        var and7 = BStream.andZD[7];
        var isbig = false;
        var bigs = '';

        var t7='';//判断是否0填充了7位；

        if(  this.readBit() ){

            if( this.readBit() ){

                    t = this.readBit( 6 );

                    if(us){

                        t1 = t>>5 ? -1 : 1;
                        t =  t&31;
                        while(1){
                            ji++;
                            t2 = this.readBit( 8 );

                            if(!isbig&&ji>=4){
                                    isbig = true;
                                    bigs = t.toString(2);
                            }


                            if(isbig){

                                    t3 = t2&and7;
                                    t4 = BStream.getpow2(t3);

                                    t7 = 7-t4;
                                    if(t4<7){
                                        bigs += BStream.ss('0',t7) + (t7===7?'':t3.toString(2));
                                    }else{
                                        bigs += t3.toString(2);
                                    }

                            }else{

                                    t = (t<<7) + (t2&and7)

                            }

                            if(t2>>7)break;

                        }
                        

                        re = ( (isbig?parseInt(bigs,2):t))*t1
                    }else{

                       var jii = 10000;
                       t =  t&63;
                       while(1){
                           jii--;
                         
                           ji++;
                           t2 = this.readBit( 8 );


                           if(!isbig&&ji>=4){
                                isbig = true;
                                bigs = t.toString(2);
                           }


                           if(isbig){

                                t3 = t2&and7;

                                t4 = BStream.getpow2(t3);
                                t7 = 7-t4;

                                if(t4<7){

                                    bigs += BStream.ss('0',t7) + (t7===7?'':t3.toString(2));
                                   
                                }else{

                                    bigs += t3.toString(2);
                                }

                           }else{

                                t = (t<<7) + (t2&and7)

                           }

                           if(t2>>7)break;
                        }

                        re =(isbig?parseInt(bigs,2):t)

                    }

             

            } else {

                t = this.readBit( 6 );
                re = us ? ( (t&31)+3 ) * ( (t>>5)&1 ? -1:1 ) : (t&63) + 7

            }

        } else {

            t = this.readBit( 3 );
            re= us ? ( (t&3) ) * ( (t>>2)&1 ? -1:1 ) : (t&7) ;
        }

        return re;
    }

};

Object.defineProperty(BStream.prototype,"br",{ 
  get: function(p){ 
     return 8-this.bi
  } 
}); 


BStream.andZD = 
function(){
        var ar = [0],i=0;
        while(i++<64)ar.push(parseInt(String(1).repeat(i),2));
        return ar;
}();


BStream.BIGNUM = BStream.andZD[30];

BStream.ss = function(s,num){return num<=0?'':new Array(1+num).join(s)};
BStream.getpow2 = function( n ){return Math.ceil(Math.log(n+1)/Math.LN2) }

//自适应长度存储 8*n bit
BStream.enLength = function(){

    var zd = (function(){
        var zd = [null];
        for(var i=1,l=15;i<l;i++){
            zd.push( Math.pow(2,7*i))
        }
        return zd
    })();

    return function( num ){

        var i=0,l=zd.length, s=[];
        for(;i<l;i++) if(num<zd[i])break;



        for(var j=i-1;j>=0;j--){
            if(j==0){
                s.push(128|(num&BStream.andZD[7]))
            }else{
            s.push( ( num>>(j*7)&BStream.andZD[7])  )
            }
        }
        return s
    }

}();

BStream.decLength = function ( buffer ){
    var i = 0, tmp , num = 0;
    while(1){
        tmp = buffer[i++]
        num = (num<<7) | (tmp&BStream.andZD[7]);
        if( tmp>>7)break;
    }
    return num;
};

var JSOS = {};

JSOS.TYPE = {

    STRING:0,
    NULL:1,
    NUMBER:2,
    BOOLEAN:3,
    FLOAT:4,
    INT:5,
    BOOLEANFLASE:6, //110
    BOOLEANTRUE:7, // 111
    INTZ: 8,    // 1000 正整 
    INTF: 9,  //  1001 负整
    FLOATZ: 10,  // 1010 正都浮点
    FLOATF: 11,// 1011 负 浮点
    OBJECT:12

};

var getFloatCf = function(){

    var a = /(e=?)(\S*)/,
        b = /([\.0-9]*)(?=e)/;
    return  function(num){
        var s = num.toExponential(),
              e =parseInt( a.exec(s)[2] ),
              n =b.exec(s)[0],
              f = parseInt( n );

        return {
            e:e,
            n: f==n?parseInt(n):Math.round(n* Math.pow(10,n.length-2))
        }
     }
}();



var _parseFloat = function(n,e){ 
 
    var w = 0,tem;
    function c10( num ){
        if( (tem=num/10)>=1){
            w++;
            c10(tem);
        }
    }
    c10(n);
    return parseFloat(n+'e'+ (e-w) );
}


BStream.getFloatCf = getFloatCf;
BStream._parseFloat = _parseFloat;

function getType( obj,data,i ){

    switch( typeof obj ){
        case 'object':
            if( obj===null ){
                return JSOS.TYPE.NULL
            }else{
                return JSOS.TYPE.OBJECT
            }
        break;

        case 'boolean':
            return JSOS.TYPE.BOOLEAN;break;

        case 'number':

            if( parseInt(obj) === obj){
                return JSOS.TYPE.INT
            }else{
                return JSOS.TYPE.FLOAT
            }
        break;
        case 'string':
            return  JSOS.TYPE.STRING;
        break;
    }

    
}

// jsos
// head = types length + keylength 
// data = types + float_e + float_n+ int_n + key_length + string_length + string 

function writeData( data, key ){
    
    var stream = new BStream();

    stream.writeString('jsos');
    stream.writeAutoNum(2);//版本号
    stream.writeAutoNum(data.length);
    stream.writeAutoNum(key.length);

    
    var strings = '',
        float_e = [],
        float_n = [],
        int_n = [],
        key_length = [], //key 长度
        string_length = [],// string长度
        string = [],
        tmp ;
    
    //var types = stream; // null boolean  都包含了 只有数字 和 字符串存储

    // 写入2位标识type，数字后两位表示 int 或者 float， 正或者负
    data.forEach(function(m,i){
        switch( getType(m,data,i) ){
            case JSOS.TYPE.STRING:
                stream.writeBit( JSOS.TYPE.STRING, 2 );
                string.push( m );
            break;
            case JSOS.TYPE.INT:
                stream.writeBit( JSOS.TYPE.NUMBER, 2 );
                stream.writeBit( parseInt( '0' + (m < 0 ? 0 : 1) , 2 ), 2 ); 
                int_n.push( Math.abs(m) );
            break;
            case JSOS.TYPE.FLOAT:

                stream.writeBit( JSOS.TYPE.NUMBER, 2 );
                stream.writeBit( parseInt( '1' + (m < 0 ? 0 : 1) , 2 ), 2 );

                tmp = getFloatCf( m );
                float_e.push( tmp.e );
                float_n.push( tmp.n );

            break;
            case JSOS.TYPE.NULL:
                stream.writeBit( JSOS.TYPE.NULL, 2 ); 
            break;
            case JSOS.TYPE.BOOLEAN:
                stream.writeBit( (JSOS.TYPE.BOOLEAN<<1) | (m?1:0) , 3 );
            break;
        };
    });

    float_e.forEach(function(m){
        //指数有符号(正负)
        stream.writeShortNum( m, true );
    });
    
    float_n.forEach(function(m){
        stream.writeShortNum(m)
    });

    int_n.forEach(function(m){
        stream.writeShortNum(m)
    });

    key.forEach(function(m){
        stream.writeShortNum(m.length)
    });


    string.forEach(function(m){
        stream.writeShortNum(m.length)
    });

    stream.writeEnd();

    key.forEach(function(m){
        strings+=m;
        stream.writeString(m)
    });

    string.forEach(function(m){
        strings+=m;
        stream.writeString(m)
    });

    return stream

}

function readData( stream ){

    var head = stream.readString(4);
    var v = stream.readAutoNum();//版本号
    if(head!=='jsos') return console.log("不可识别的文件类型");
    
    var type_length = stream.readAutoNum();
    var key_length = stream.readAutoNum();
    var types = [], tem ;
    
    var float_e = [], float_l = 0 ;
    var float_n = [] ;
    var int_n = [], int_l = 0 ;
    var key = [];      //keylength //存储一个key的字符串个数 
    var string = [], string_l = 0;   // 存储一个字符串数据的字符串个数
    var strings , all_string_l = 0;  //所有字符串

    var string_i = 0;
    var data = [];
    
    while(type_length--){
       

        switch(stream.readBit(2)){
            case JSOS.TYPE.STRING: types.push(JSOS.TYPE.STRING);string_l++;break;
            case JSOS.TYPE.NUMBER:
                tem = stream.readBit(2);
              
                if(tem>>1){
                    float_l++;
                    if(tem&1){
                        //正浮点数
                        types.push(JSOS.TYPE.FLOATZ);
                    }else{
                        //负浮点数
                        types.push(JSOS.TYPE.FLOATF);
                    }
                }else{
                    int_l++;
                    if(tem&1){
                        //正整点数
                        types.push(JSOS.TYPE.INTZ);
                    }else{
                        //负整点数
                        types.push(JSOS.TYPE.INTF);
                    }
                }
            break;
            case JSOS.TYPE.NULL:types.push(JSOS.TYPE.NULL);break;
            case JSOS.TYPE.BOOLEAN:

                if( stream.readBit(1) ){
                    types.push(JSOS.TYPE.BOOLEANTRUE);
                }else{
                    types.push(JSOS.TYPE.BOOLEANFLASE);                
                }
            break;
        }
    }

    tem = float_l;
    while(tem-->0) float_e.push( stream.readShortNum(true) );

    tem = float_l;
    while(tem-->0) float_n.push( stream.readShortNum() );
  
    tem = int_l;
    while(tem-->0) int_n.push( stream.readShortNum() );
    
    while(key_length-->0){
        key.push(tem = stream.readShortNum() );
        all_string_l +=tem;
    }

  

    while(string_l-->0){
        string.push( tem = stream.readShortNum() );
        all_string_l +=tem;
    }
    
    stream.readEnd();

    strings = stream.readString(all_string_l);

    for(var i=0,l=key.length;i<l;i++){

        tem = key[i];
        key[i] = strings.substr(string_i,tem) ;
        string_i+=tem;
    }

    
    var i_string = 0, i_int_n = 0, i_float_n = 0, i_float_e = 0;

    for(var i=0,l=types.length;i<l;i++){

        switch(types[i]){

            case JSOS.TYPE.BOOLEANTRUE:data.push(true);break;

            case JSOS.TYPE.BOOLEANFLASE:data.push(false);break;
            case JSOS.TYPE.NULL:data.push(null);break;

            case JSOS.TYPE.STRING:
 
                tem = string[i_string++];    
                data.push( strings.substr(string_i,tem) );
                string_i+=tem;
            
            break;

            case JSOS.TYPE.INTZ:

                data.push( int_n[i_int_n++] );
            
            break;

            case JSOS.TYPE.INTF:

                data.push( -int_n[i_int_n++] );

            break;

            case JSOS.TYPE.FLOATZ:
                data.push( _parseFloat( float_n[i_float_n++], float_e[i_float_e++] ) );
            break;
            case JSOS.TYPE.FLOATF:
                data.push( -_parseFloat( float_n[i_float_n++], float_e[i_float_e++] ) );
            break;
        }
    }

    return { key, data }
}


function enJson( json ){


    var f = new BStream();
    var n = [];  //nodes
    var k = []; //keys
    var d = []; //datas 
   
    // 11 开始 10 结束
    // 当为11 的时候在后面写1位，标识类型 1为 arr 0 为obj。
    // a(boolean) = isArray
    function each( o, a ){

        // t.push(a?1:0)
        // 记录次数
        var ci = 0 ;

        //写头 11  111 arr ,110 obj
        
        f.writeBit( a ? 7 : 6 , 3 );


        // n.push('{')
        for(var i in o ){
            !a&&k.push(i);
            if( typeof o[i] ==='object' && o[i] !== null ){
                if(ci) {

                 
                    f.writeBit(0,1);
                    f.writeShortNum(ci);

                }            
                ci = 0;
                each(o[i],Array.isArray(o[i]));
            }else{
                ci++;
                d.push(o[i])
            }
        }

        if(ci){
            f.writeBit(0,1);
            f.writeShortNum(ci);


        }

        f.writeBit( 2,2);
    }

    each( json, Array.isArray( json ) );

    f.writeEnd();
    return new Uint8Array( writeData( d, k ).writeStream(f).getBuffer() );

}



function decJson( buffer ){

    var stream = new BStream(buffer);
    var tem = readData(stream);

    var data = tem.data;
    var key = tem.key;

    var k =false;
    var ki = 0;
    var num = 0,tem;
    var tree = [];
    var s = '';
    var isa = false;
    var pp = null;
    var ss = [];

    var i_key =0, i_data = 0;

    function getK(){
        let _k = key[i_key++];
        _k = _k.replace(/\\/, "\\\\");
        return '"' + _k + '":';
    }

    var d;

    function getD(){

        d = data[i_data++];

        if(typeof d ==='string'){
            d = d.replace(/\\/, "\\\\");
            return '"'+d+'"';
        }else{
            return  d ;
        }
    }

    while(1){ 

        //取一位表示 是结构  还是数据
        if( stream.readBit() ){

            //这里一位表示写头 还是 写尾，如果是头，需要再写一位表示 obj 还是 array
            if( stream.readBit() ){

                // if( k&&!isa )s += getK() ;
                if( k&&!isa )ss.push( getK() );
                
                
                if( stream.readBit() ){

                    isa = true;
                    ss.push('[');
                    tree.push(']');
                    
                }else{

                    isa = false;
                    ss.push('{');
                    tree.push('}');

                }

                if(!k){
                    k=true;
                }
                
            }else{

                //pp = tree.pop()+',';
                if(ss[ss.length-1]===','){
                    ss.pop();
                }

                ss.push(tree.pop());
                ss.push(',');

                isa = tree[tree.length-1] === ']' ;
                

            }

        } else {
            tem = stream.readShortNum();

            while(tem-->0){

                if(isa){
                    ss.push(getD(tem))

                    if(tem)ss.push(',');

                }else{

                    ss.push( getK() + getD(true) )
                    ss.push(',');
                }
            }
        }

        if(tree.length===0)break;

    }
    ss.pop();

    // console.log(ss)
    return JSON.parse(ss.join(''));

    // return eval(ss.join(''));

}

return {
    decompress:decJson,
    compress:enJson
}

}();


// if(module)module.exports = jsob;
// module.exports = jsob;
