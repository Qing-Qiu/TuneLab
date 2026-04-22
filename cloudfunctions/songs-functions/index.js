// 云函数入口文件
const cloud = require('wx-server-sdk')
const axios = require('axios'); // 引入axios

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
}) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  let {
    key,
    pn,
    rn,
  } = event; // 获取请求参数
  // const rn = 30;
  pn = pn - 1;
  key = encodeURI(key);
  const url = `http://search.kuwo.cn/r.s?pn=${pn}&rn=${rn}&all=${key}&ft=music&newsearch=1&alflac=1&itemset=web_2013&client=kt&cluster=0&vermerge=1&rformat=json&encoding=utf8&show_copyright_off=1&pcmp4=1&ver=mbox&plat=pc&vipver=MUSIC_9.2.0.0_W6&devid=11404450&newver=1&issubtitle=1&pcjson=1`;
  console.log(url);
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.1901.188'
  };

  try {
    // 使用axios发起请求
    const response = await axios.get(url, {
      headers
    });
    const search = [];
    const responseJson = response.data; // 获取响应的JSON数据

    if (responseJson && responseJson.abslist) {
      for (const song of responseJson.abslist) {
        let pic = '';
        if (song.web_albumpic_short !== '') {
          if (song.web_albumpic_short.includes("120")) {
            let str = song.web_albumpic_short.replace("120", "300")
            pic = `https://img4.kuwo.cn/star/albumcover/` + str;
            console.log(pic);
          } else {
            let str = song.web_albumpic_short;
            pic = `https://img4.kuwo.cn/star/albumcover/` + str;
            console.log(pic);
          }
        } else if (song.web_artistpic_short) {
          if (song.web_artistpic_short.includes("120")) {
            let str = song.web_artistpic_short.replace("120", "300")
            pic = `https://img1.kuwo.cn/star/starheads/` + str;
            console.log(pic);
          } else {
            let str = song.web_artistpic_short
            pic = `https://img1.kuwo.cn/star/starheads/` + str;
            console.log(pic);
          }
        }

        const tempList = {
          name: song.SONGNAME,
          artist: song.ARTIST,
          rid: parseInt(song.DC_TARGETID),
          pic: pic
        };
        search.push(tempList);
      }
    }

    return search; // 返回搜索结果
  } catch (error) {
    console.error('Server Error:', error.message);
    return {
      error: 'Server Error',
      details: error.message
    }; // 返回错误信息
  }
}