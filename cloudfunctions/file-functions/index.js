// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
}) // 使用当前云环境


var xlsx = require('node-xlsx');
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const fileID = event.fileID
  if (!fileID) {
    return { code: 1, msg: 'fileID is required' }
  }

  //1,通过fileID下载云存储里的excel文件
  const res = await cloud.downloadFile({
    fileID: fileID,
  })
  console.log('下载的文件', res);
  const file_xlsx = res.fileContent
  //2,解析excel文件里的数据
  const files = xlsx.parse(file_xlsx); //获取到已经解析的对象数组
  const rows = files[0] && files[0].data ? files[0].data : []
  console.log('获得内容表格数组', rows); //rows里面就是我们的内容数组

  let imported = 0
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length === 0) continue

    await db.collection("singer2").add({
      data: {
        name: row[0],
        artist: row[1],
        rid: row[2],
        pic: row[3],
        lrc: row[5],
      }
    })
    imported++
  }

  //循环结束删除上传的文件不占用云存储
  const deleteRes = await cloud.deleteFile({
    fileList: [fileID],
  })
  console.log(deleteRes, '删除文件')

  return { code: 0, imported }
}
