const axios = require('axios');
const AK = "GaRrOONIFOM7fxZDAbkuASjn"
const SK = "maIpJkoEaP3sPtbBkjdGUalTr6QtwSWi"

async function main() {
    var options = {
        'method': 'POST',
        'url': 'https://aip.baidubce.com/rpc/2.0/nlp/v1/sentiment_classify?charset=UTF-8&access_token=' + await getAccessToken(),
        'headers': {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
        },
        data: JSON.stringify({
                "text": "你好"
        })
    };

    axios(options)
        .then(response => {
            console.log(response.data);
        })
        .catch(error => {
            throw new Error(error);
        })
}

/**
 * 使用 AK，SK 生成鉴权签名（Access Token）
 * @return string 鉴权签名信息（Access Token）
 */
function getAccessToken() {

    let options = {
        'method': 'POST',
        'url': 'https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=' + AK + '&client_secret=' + SK,
    }
    return new Promise((resolve, reject) => {
      axios(options)
          .then(res => {
              resolve(res.data.access_token)
          })
          .catch(error => {
              reject(error)
          })
    })
}
main();

