const nodeList = [
  { title: 'Chapter 1', line_num: 1, level: 1, text: 'Content' },
  { title: 'Section 1.1', line_num: 5, level: 2, text: 'Content' },
  { title: 'Chapter 2', line_num: 9, level: 1, text: 'Content' },
];

const rootNodes = [];
const stack = [];

for (const item of nodeList) {
  const node = {
    title: item.title,
    line_num: item.line_num,
    level: item.level,
    text: item.text,
    nodes: [],
  };

  while (stack.length > 0 && (stack[stack.length - 1].level || 0) >= item.level) {
    stack.pop();
  }

  if (stack.length > 0) {
    stack[stack.length - 1].nodes.push(node);
  } else {
    rootNodes.push(node);
  }

  stack.push(node);
}

console.log('Built tree:', JSON.stringify(rootNodes, null, 2));
