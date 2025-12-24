import { NewApiClient } from "./client";



const client = new NewApiClient({
    baseURL: `http://121.37.207.134:8000/`,
})

client.login({
    username: `1037`,
    password: `12345678`
}).then(token => console.log(token))