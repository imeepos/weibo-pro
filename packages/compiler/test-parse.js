const testData = 'data:{"type":"message_start","message":{"id":"msg_test","type":"message","role":"assistant","content":[],"model":"test","stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":7,"output_tokens":0}}}';

const data = testData.slice(6);
try {
    const json = JSON.parse(data);
    console.log('Parse success:', json.type);
} catch (e) {
    console.error('Parse failed:', e.message);
}
