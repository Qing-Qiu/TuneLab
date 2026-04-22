// 云函数入口文件
const cloud = require('wx-server-sdk')
const axios = require('axios'); // 引入axios
const regex = /url=(.*)/; // 正则表达式，用于提取 URL
const crypto = require('crypto');
const base64js = require('base64-js');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
}) // 使用当前云环境


class KwApi {
  static DES_MODE_DECRYPT = BigInt(1); // 将常量转换为 BigInt 类型

  static arrayE = [
    BigInt(31), BigInt(0), KwApi.DES_MODE_DECRYPT, BigInt(2), BigInt(3), BigInt(4), BigInt(-1), BigInt(-1),
    BigInt(3), BigInt(4), BigInt(5), BigInt(6), BigInt(7), BigInt(8), BigInt(-1), BigInt(-1), BigInt(7), BigInt(8),
    BigInt(9), BigInt(10), BigInt(11), BigInt(12), BigInt(-1), BigInt(-1), BigInt(11), BigInt(12), BigInt(13),
    BigInt(14), BigInt(15), BigInt(16), BigInt(-1), BigInt(-1), BigInt(15), BigInt(16), BigInt(17), BigInt(18),
    BigInt(19), BigInt(20), BigInt(-1), BigInt(-1), BigInt(19), BigInt(20), BigInt(21), BigInt(22), BigInt(23),
    BigInt(24), BigInt(-1), BigInt(-1), BigInt(23), BigInt(24), BigInt(25), BigInt(26), BigInt(27), BigInt(28),
    BigInt(-1), BigInt(-1), BigInt(27), BigInt(28), BigInt(29), BigInt(30), BigInt(31), BigInt(30), BigInt(-1),
    BigInt(-1)
  ];

  static arrayIP = [
    BigInt(57), BigInt(49), BigInt(41), BigInt(33), BigInt(25), BigInt(17), BigInt(9), KwApi.DES_MODE_DECRYPT,
    BigInt(59), BigInt(51), BigInt(43), BigInt(35), BigInt(27), BigInt(19), BigInt(11), BigInt(3), BigInt(61),
    BigInt(53), BigInt(45), BigInt(37), BigInt(29), BigInt(21), BigInt(13), BigInt(5), BigInt(63), BigInt(55),
    BigInt(47), BigInt(39), BigInt(31), BigInt(23), BigInt(15), BigInt(7), BigInt(56), BigInt(48), BigInt(40),
    BigInt(32), BigInt(24), BigInt(16), BigInt(8), BigInt(0), BigInt(58), BigInt(50), BigInt(42), BigInt(34),
    BigInt(26), BigInt(18), BigInt(10), BigInt(2), BigInt(60), BigInt(52), BigInt(44), BigInt(36), BigInt(28),
    BigInt(20), BigInt(12), BigInt(4), BigInt(62), BigInt(54), BigInt(46), BigInt(38), BigInt(30), BigInt(22),
    BigInt(14), BigInt(6)
  ];

  static arrayIP_1 = [
    BigInt(39), BigInt(7), BigInt(47), BigInt(15), BigInt(55), BigInt(23), BigInt(63), BigInt(31),
    BigInt(38), BigInt(6), BigInt(46), BigInt(14), BigInt(54), BigInt(22), BigInt(62), BigInt(30),
    BigInt(37), BigInt(5), BigInt(45), BigInt(13), BigInt(53), BigInt(21), BigInt(61), BigInt(29),
    BigInt(36), BigInt(4), BigInt(44), BigInt(12), BigInt(52), BigInt(20), BigInt(60), BigInt(28),
    BigInt(35), BigInt(3), BigInt(43), BigInt(11), BigInt(51), BigInt(19), BigInt(59), BigInt(27),
    BigInt(34), BigInt(2), BigInt(42), BigInt(10), BigInt(50), BigInt(18), BigInt(58), BigInt(26), BigInt(33),
    KwApi.DES_MODE_DECRYPT, BigInt(41), BigInt(9), BigInt(49), BigInt(17), BigInt(57), BigInt(25),
    BigInt(32), BigInt(0), BigInt(40), BigInt(8), BigInt(48), BigInt(16), BigInt(56), BigInt(24)
  ];

  static arrayLs = [BigInt(1), BigInt(1), BigInt(2), BigInt(2), BigInt(2), BigInt(2), BigInt(2), BigInt(2),
    BigInt(1), BigInt(2), BigInt(2), BigInt(2), BigInt(2), BigInt(2), BigInt(2), BigInt(1)
  ];

  static arrayLsMask = [BigInt(0), BigInt(0x100001), BigInt(0x300003)];
  static arrayMask = [...Array(64).keys()].map(i => BigInt(2 ** i) * (i === 63 ? -BigInt(1) : BigInt(1)));

  static arrayP = [
    BigInt(15), BigInt(6), BigInt(19), BigInt(20), BigInt(28), BigInt(11), BigInt(27), BigInt(16),
    BigInt(0), BigInt(14), BigInt(22), BigInt(25), BigInt(4), BigInt(17), BigInt(30), BigInt(9),
    BigInt(1), BigInt(7), BigInt(23), BigInt(13), BigInt(31), BigInt(26), BigInt(2), BigInt(8),
    BigInt(18), BigInt(12), BigInt(29), BigInt(5), BigInt(21), BigInt(10), BigInt(3), BigInt(24)
  ];

  static arrayPC_1 = [
    BigInt(56), BigInt(48), BigInt(40), BigInt(32), BigInt(24), BigInt(16), BigInt(8), BigInt(0),
    BigInt(57), BigInt(49), BigInt(41), BigInt(33), BigInt(25), BigInt(17), BigInt(9), BigInt(1),
    BigInt(58), BigInt(50), BigInt(42), BigInt(34), BigInt(26), BigInt(18), BigInt(10), BigInt(2),
    BigInt(59), BigInt(51), BigInt(43), BigInt(35), BigInt(62), BigInt(54), BigInt(46), BigInt(38),
    BigInt(30), BigInt(22), BigInt(14), BigInt(6), BigInt(61), BigInt(53), BigInt(45), BigInt(37),
    BigInt(29), BigInt(21), BigInt(13), BigInt(5), BigInt(60), BigInt(52), BigInt(44), BigInt(36),
    BigInt(28), BigInt(20), BigInt(12), BigInt(4), BigInt(27), BigInt(19), BigInt(11), BigInt(3)
  ];

  static arrayPC_2 = [
    BigInt(13), BigInt(16), BigInt(10), BigInt(23), BigInt(0), BigInt(4), BigInt(-1), BigInt(-1),
    BigInt(2), BigInt(27), BigInt(14), BigInt(5), BigInt(20), BigInt(9), BigInt(-1), BigInt(-1),
    BigInt(22), BigInt(18), BigInt(11), BigInt(3), BigInt(25), BigInt(7), BigInt(-1), BigInt(-1),
    BigInt(15), BigInt(6), BigInt(26), BigInt(19), BigInt(12), BigInt(1), BigInt(-1), BigInt(-1),
    BigInt(40), BigInt(51), BigInt(30), BigInt(36), BigInt(46), BigInt(54), BigInt(-1), BigInt(-1),
    BigInt(29), BigInt(39), BigInt(50), BigInt(44), BigInt(32), BigInt(47), BigInt(-1), BigInt(-1), BigInt(43), BigInt(48), BigInt(38), BigInt(55), BigInt(33), BigInt(52), BigInt(-1), BigInt(-1), BigInt(45), BigInt(41), BigInt(49), BigInt(35), BigInt(28), BigInt(31), BigInt(-1), BigInt(-1)
  ];
  static matrixNSBox = [
    [
      BigInt(14), BigInt(4), BigInt(3), BigInt(15), BigInt(2), BigInt(13), BigInt(5), BigInt(3),
      BigInt(13), BigInt(14), BigInt(6), BigInt(9), BigInt(11), BigInt(2), BigInt(0), BigInt(5),
      BigInt(4), BigInt(1), BigInt(10), BigInt(12), BigInt(15), BigInt(6), BigInt(9), BigInt(10),
      BigInt(1), BigInt(8), BigInt(12), BigInt(7), BigInt(8), BigInt(11), BigInt(7), BigInt(0),
      BigInt(0), BigInt(15), BigInt(10), BigInt(5), BigInt(14), BigInt(4), BigInt(9), BigInt(10),
      BigInt(7), BigInt(8), BigInt(12), BigInt(3), BigInt(13), BigInt(1), BigInt(3), BigInt(6),
      BigInt(15), BigInt(12), BigInt(6), BigInt(11), BigInt(2), BigInt(9), BigInt(5), BigInt(0),
      BigInt(4), BigInt(2), BigInt(11), BigInt(14), BigInt(1), BigInt(7), BigInt(8), BigInt(13),
    ],
    [
      BigInt(15), BigInt(0), BigInt(9), BigInt(5), BigInt(6), BigInt(10), BigInt(12), BigInt(9),
      BigInt(8), BigInt(7), BigInt(2), BigInt(12), BigInt(3), BigInt(13), BigInt(5), BigInt(2),
      BigInt(1), BigInt(14), BigInt(7), BigInt(8), BigInt(11), BigInt(4), BigInt(0), BigInt(3),
      BigInt(14), BigInt(11), BigInt(13), BigInt(6), BigInt(4), BigInt(1), BigInt(10), BigInt(15),
      BigInt(3), BigInt(13), BigInt(12), BigInt(11), BigInt(15), BigInt(3), BigInt(6), BigInt(0),
      BigInt(4), BigInt(10), BigInt(1), BigInt(7), BigInt(8), BigInt(4), BigInt(11), BigInt(14),
      BigInt(13), BigInt(8), BigInt(0), BigInt(6), BigInt(2), BigInt(15), BigInt(9), BigInt(5),
      BigInt(7), BigInt(1), BigInt(10), BigInt(12), BigInt(14), BigInt(2), BigInt(5), BigInt(9),
    ],
    [
      BigInt(10), BigInt(13), BigInt(1), BigInt(11), BigInt(6), BigInt(8), BigInt(11), BigInt(5),
      BigInt(9), BigInt(4), BigInt(12), BigInt(2), BigInt(15), BigInt(3), BigInt(2), BigInt(14),
      BigInt(0), BigInt(6), BigInt(13), BigInt(1), BigInt(3), BigInt(15), BigInt(4), BigInt(10),
      BigInt(14), BigInt(9), BigInt(7), BigInt(12), BigInt(5), BigInt(0), BigInt(8), BigInt(7),
      BigInt(13), BigInt(1), BigInt(2), BigInt(4), BigInt(3), BigInt(6), BigInt(12), BigInt(11),
      BigInt(0), BigInt(13), BigInt(5), BigInt(14), BigInt(6), BigInt(8), BigInt(15), BigInt(2),
      BigInt(7), BigInt(10), BigInt(8), BigInt(15), BigInt(4), BigInt(9), BigInt(11), BigInt(5),
      BigInt(9), BigInt(0), BigInt(14), BigInt(3), BigInt(10), BigInt(7), BigInt(1), BigInt(12),
    ],
    [
      BigInt(7), BigInt(10), BigInt(1), BigInt(15), BigInt(0), BigInt(12), BigInt(11), BigInt(5),
      BigInt(14), BigInt(9), BigInt(8), BigInt(3), BigInt(9), BigInt(7), BigInt(4), BigInt(8),
      BigInt(13), BigInt(6), BigInt(2), BigInt(1), BigInt(6), BigInt(11), BigInt(12), BigInt(2),
      BigInt(3), BigInt(0), BigInt(5), BigInt(14), BigInt(10), BigInt(13), BigInt(15), BigInt(4),
      BigInt(13), BigInt(3), BigInt(4), BigInt(9), BigInt(6), BigInt(10), BigInt(1), BigInt(12),
      BigInt(11), BigInt(0), BigInt(2), BigInt(5), BigInt(0), BigInt(13), BigInt(14), BigInt(2),
      BigInt(8), BigInt(15), BigInt(7), BigInt(4), BigInt(15), BigInt(1), BigInt(10), BigInt(7),
      BigInt(5), BigInt(6), BigInt(12), BigInt(11), BigInt(3), BigInt(8), BigInt(9), BigInt(14),
    ],
    [
      BigInt(2), BigInt(4), BigInt(8), BigInt(15), BigInt(7), BigInt(10), BigInt(13), BigInt(6),
      BigInt(4), BigInt(1), BigInt(3), BigInt(12), BigInt(11), BigInt(7), BigInt(14), BigInt(0),
      BigInt(12), BigInt(2), BigInt(5), BigInt(9), BigInt(10), BigInt(13), BigInt(0), BigInt(3),
      BigInt(1), BigInt(11), BigInt(15), BigInt(5), BigInt(6), BigInt(8), BigInt(9), BigInt(14),
      BigInt(14), BigInt(11), BigInt(5), BigInt(6), BigInt(4), BigInt(1), BigInt(3), BigInt(10),
      BigInt(2), BigInt(12), BigInt(15), BigInt(0), BigInt(13), BigInt(2), BigInt(8), BigInt(5),
      BigInt(11), BigInt(8), BigInt(0), BigInt(15), BigInt(7), BigInt(14), BigInt(9), BigInt(4),
      BigInt(12), BigInt(7), BigInt(10), BigInt(9), BigInt(1), BigInt(13), BigInt(6), BigInt(3),
    ],
    [
      BigInt(12), BigInt(9), BigInt(0), BigInt(7), BigInt(9), BigInt(2), BigInt(14), BigInt(1),
      BigInt(10), BigInt(15), BigInt(3), BigInt(4), BigInt(6), BigInt(12), BigInt(5), BigInt(11),
      BigInt(1), BigInt(14), BigInt(13), BigInt(0), BigInt(2), BigInt(8), BigInt(7), BigInt(13),
      BigInt(15), BigInt(5), BigInt(4), BigInt(10), BigInt(8), BigInt(3), BigInt(11), BigInt(6),
      BigInt(10), BigInt(4), BigInt(6), BigInt(11), BigInt(7), BigInt(9), BigInt(0), BigInt(6),
      BigInt(4), BigInt(2), BigInt(13), BigInt(1), BigInt(9), BigInt(15), BigInt(3), BigInt(8),
      BigInt(15), BigInt(3), BigInt(1), BigInt(14), BigInt(12), BigInt(5), BigInt(11), BigInt(0),
      BigInt(2), BigInt(12), BigInt(14), BigInt(7), BigInt(5), BigInt(10), BigInt(8), BigInt(13),
    ],
    [
      BigInt(4), BigInt(1), BigInt(3), BigInt(10), BigInt(15), BigInt(12), BigInt(5), BigInt(0),
      BigInt(2), BigInt(11), BigInt(9), BigInt(6), BigInt(8), BigInt(7), BigInt(6), BigInt(9),
      BigInt(11), BigInt(4), BigInt(12), BigInt(15), BigInt(0), BigInt(3), BigInt(10), BigInt(5),
      BigInt(14), BigInt(13), BigInt(7), BigInt(8), BigInt(13), BigInt(14), BigInt(1), BigInt(2),
      BigInt(13), BigInt(6), BigInt(14), BigInt(9), BigInt(4), BigInt(1), BigInt(2), BigInt(14),
      BigInt(11), BigInt(13), BigInt(5), BigInt(0), BigInt(1), BigInt(10), BigInt(8), BigInt(3),
      BigInt(0), BigInt(11), BigInt(3), BigInt(5), BigInt(9), BigInt(4), BigInt(15), BigInt(2),
      BigInt(7), BigInt(8), BigInt(12), BigInt(15), BigInt(10), BigInt(7), BigInt(6), BigInt(12),
    ],
    [
      BigInt(13), BigInt(7), BigInt(10), BigInt(0), BigInt(6), BigInt(9), BigInt(5), BigInt(15),
      BigInt(8), BigInt(4), BigInt(3), BigInt(10), BigInt(11), BigInt(14), BigInt(12), BigInt(5),
      BigInt(2), BigInt(11), BigInt(9), BigInt(6), BigInt(15), BigInt(12), BigInt(0), BigInt(3),
      BigInt(4), BigInt(1), BigInt(14), BigInt(13), BigInt(1), BigInt(2), BigInt(7), BigInt(8),
      BigInt(1), BigInt(2), BigInt(12), BigInt(15), BigInt(10), BigInt(4), BigInt(0), BigInt(3),
      BigInt(13), BigInt(14), BigInt(6), BigInt(9), BigInt(7), BigInt(8), BigInt(9), BigInt(6),
      BigInt(15), BigInt(1), BigInt(5), BigInt(12), BigInt(3), BigInt(10), BigInt(14), BigInt(5),
      BigInt(8), BigInt(7), BigInt(11), BigInt(0), BigInt(4), BigInt(13), BigInt(2), BigInt(11),
    ],
  ];

  static SECRET_KEY = Buffer.from('ylzsxkwm');

  static bit_transform(arr_int, n, l) {
    let l2 = BigInt(0); // 使用 BigInt 来存储结果
    for (let i = 0; i < n; i++) {
      if ((arr_int[i] < BigInt(0)) || ((l & KwApi.arrayMask[Number(arr_int[i])]) === BigInt(0))) continue;
      l2 |= BigInt(KwApi.arrayMask[i]);
    }
    return l2;
  }

  static DES64(longs, l) {
    let out = BigInt(0); // 改为 BigInt
    let SOut = BigInt(0); // 改为 BigInt
    let pR = new Array(8).fill(0);
    let pSource = [BigInt(0), BigInt(0)]; // 使用 BigInt 类型
    let R = BigInt(0); // 使用 BigInt
    let L = BigInt(0); // 使用 BigInt

    out = KwApi.bit_transform(KwApi.arrayIP, 64, l);
    pSource[0] = out & BigInt(0xFFFFFFFF); // 使用 BigInt 进行掩码操作
    pSource[1] = (out & BigInt(-4294967296)) >> BigInt(32);

    for (let i = 0; i < 16; i++) {
      R = pSource[1];
      R = KwApi.bit_transform(KwApi.arrayE, 64, R);
      R ^= BigInt(longs[i]);
      for (let j = 0; j < 8; j++) {
        pR[j] = Number(R >> BigInt(j * 8) & BigInt(255));
      }

      SOut = BigInt(0);
      for (let sbi = 7; sbi >= 0; sbi--) {
        SOut = (SOut << BigInt(4)) | BigInt(KwApi.matrixNSBox[sbi][pR[sbi]]);
      }

      R = KwApi.bit_transform(KwApi.arrayP, 32, SOut);
      L = pSource[0];
      pSource[0] = pSource[1];
      pSource[1] = L ^ R;
    }
    pSource.reverse();
    out = BigInt(-4294967296) & pSource[1] << BigInt(32) | BigInt(0xFFFFFFFF) & pSource[0];
    out = KwApi.bit_transform(KwApi.arrayIP_1, 64, out);
    return out;
  }

  static sub_keys(l, longs, n) {
    let l2 = KwApi.bit_transform(KwApi.arrayPC_1, 56, l);
    for (let i = 0; i < 16; i++) {
      l2 = ((l2 & KwApi.arrayLsMask[KwApi.arrayLs[i]]) << BigInt(BigInt(28) - KwApi.arrayLs[i]) |
        (l2 & ~KwApi.arrayLsMask[KwApi.arrayLs[i]]) >> BigInt(KwApi.arrayLs[i]));
      longs[i] = KwApi.bit_transform(KwApi.arrayPC_2, 64, l2);
    }

    let j = 0;
    while (n === 1 && j < 8) {
      let l3 = longs[j];
      longs[j] = longs[15 - j];
      longs[15 - j] = l3;
      j++;
    }
  }
  static encrypt(msg, key = KwApi.SECRET_KEY) {
    if (typeof msg === 'string') {
      msg = Buffer.from(msg);
    }
    if (typeof key === 'string') {
      key = Buffer.from(key);
    }

    // 处理密钥块
    let l = BigInt(0);
    for (let i = 0; i < 8; i++) {
      l |= BigInt(key[i]) << BigInt(i * 8); // 转换为 BigInt 并执行位移操作
    }
    // 计算分块
    let j = Math.floor(msg.length / 8);
    let arrLong1 = new Array(16).fill(BigInt(0)); // 使用 BigInt 数组
    KwApi.sub_keys(l, arrLong1, 0);
    let arrLong2 = new Array(j).fill(BigInt(0)); // 使用 BigInt 数组

    for (let m = 0; m < j; m++) {
      for (let n = 0; n < 8; n++) {
        arrLong2[m] |= BigInt(msg[n + m * 8]) << BigInt(n * 8); // 转换为 BigInt 并执行位移
      }
    }
    let arrLong3 = new Array(Math.ceil((1 + 8 * (j + 1)) / 8)).fill(BigInt(0)); // 使用 BigInt 数组    
    for (let i1 = 0; i1 < j; i1++) {
      arrLong3[i1] = KwApi.DES64(arrLong1, arrLong2[i1]);
    }
    // 处理多出来的字节
    let arrByte1 = msg.slice(j * 8);
    let l2 = BigInt(0);
    for (let i1 = 0; i1 < arrByte1.length; i1++) {
      l2 |= BigInt(arrByte1[i1]) << BigInt(i1 * 8); // 转换为 BigInt 并执行位移
    }
    arrLong3[j] = KwApi.DES64(arrLong1, l2);
    // 转为字节数组
    let arrByte2 = new Array(8 * arrLong3.length).fill(0);
    let i4 = 0;
    for (let l3 of arrLong3) {
      for (let i6 = 0; i6 < 8; i6++) {
        arrByte2[i4] = Number(BigInt(255) & (l3 >> BigInt(i6 * 8))); // 使用 BigInt 并转回为 Number
        i4++;
      }
    }
    return arrByte2;
  }

  // base64加密
  static base64_encrypt(msg) {
    const encryptedBytes = KwApi.encrypt(msg);
    const base64Str = base64js.fromByteArray(Buffer.from(encryptedBytes));
    return base64Str.replace(/\n/g, '');
  }
}

// 云函数入口函数
exports.main = async (event, context) => {

  function kwFirstUrl(rid) {
    const encryptedString = KwApi.base64_encrypt(`user=0&android_id=0&prod=kwplayer_ar_8.5.5.0&corp=kuwo&newver=3&vipver=8.5.5.0&source=kwplayer_ar_8.5.5.0_apk_keluze.apk&p2p=1&notrace=0&type=convert_url2&br=320kmp3&format=flac|mp3|aac&sig=0&rid=${rid}&priority=bitrate&loginUid=0&network=WIFI&loginSid=0&mode=download`);
    return `http://mobi.kuwo.cn/mobi.s?f=kuwo&q=${encryptedString}`;
  }

  const {
    rid
  } = event; // 获取请求参数
  const url = kwFirstUrl(rid); // 调用外部函数获取 URL

  const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36 Edg/110.0.1587.50",
    "csrf": "96Y8RG5X3X64",
    "Referer": "https://www.kuwo.cn"
  };

  try {
    // 发起请求
    let music_url = await axios.get(url, {
      headers,
      timeout: 3000
    });
    music_url = music_url.data; // 获取返回的文本

    // 使用正则提取URL
    const match = regex.exec(music_url);
    if (match) {
      music_url = match[1]; // 获取匹配的 URL
      console.log(`已获取到 mp3 文件链接 => ${music_url}`);
      return music_url; // 返回提取到的 URL
    } else {
      console.error('未找到 URL');
      console.error('Error Info:\n' + music_url);
      throw new Error('未找到 URL');
    }
  } catch (error) {
    console.error('获取 mp3 链接失败:', error.message);
    // 如果是超时错误，进行重试
    if (error.code === 'ECONNABORTED') {
      console.log('获取mp3链接超时，正在重试……');
      try {
        let music_url = await axios.get(url, {
          headers
        });
        music_url = music_url.data;
        const match = regex.exec(music_url);
        if (match) {
          music_url = match[1];
          console.log(`已获取到 mp3 文件链接 => ${music_url}`);
          return music_url;
        } else {
          throw new Error('未找到 URL');
        }
      } catch (retryError) {
        console.error('重试失败:', retryError.message);
        throw retryError;
      }
    } else {
      throw error; // 抛出其他错误
    }
  }

}
