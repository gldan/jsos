# jsob
Compression and serialization of JSON.

This is an experimental version that has not been optimized and tested. Do not use it.
The official version will be published after the test is optimized.


### 中文
一个JSON数据序列化的库。

这是一个未经过优化和测试的实验版本，请勿使用。
正式版，会在测试优化后公布。


var jsondata = {
    a:10,
    b:20
};

var buffer = jsob.compress(jsondata); 
// Uint8Array


var decjson = jsob.decompress(buffer); 

/*
decjson = {
    a:10,
    b:20
};
*/