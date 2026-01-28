/**
 * Markdown节点提取模块
 *
 * 从Markdown文本中提取标题节点及其内容
 */

/**
 * 从Markdown内容中提取标题节点
 *
 * 扫描Markdown文本，识别所有标题（#到######），记录标题文本和行号
 * 自动跳过代码块中的内容（避免误识别代码中的注释）
 *
 * @param markdownContent - Markdown文本内容
 * @returns [节点列表, 行数组] - 节点包含标题和行号，行数组用于后续内容提取
 *
 * @example
 * ```ts
 * const markdown = "# Title\n\nContent";
 * const [nodes, lines] = extractNodesFromMarkdown(markdown);
 * // nodes: [{ node_title: "Title", line_num: 1 }]
 * // lines: ["# Title", "", "Content"]
 * ```
 */
export function extractNodesFromMarkdown(
  markdownContent: string
): [nodes: Array<{node_title: string, line_num: number}>, lines: string[]] {
  // 处理空内容
  if (!markdownContent) {
    return [[], []];
  }

  const lines = markdownContent.split('\n');
  const nodes: Array<{node_title: string, line_num: number}> = [];

  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;  // 添加空值检查

    // 检查代码块标记（支持```和~~~）
    if (line.trim().startsWith('```') || line.trim().startsWith('~~~')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    // 跳过代码块中的内容
    if (inCodeBlock) continue;

    // 匹配标题 # ## ### #### ##### ######
    // 只匹配行首的#（避免识别列表项等）
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch && headingMatch[2]) {
      nodes.push({
        node_title: headingMatch[2].trim(),
        line_num: i + 1, // 行号从1开始
      });
    }
  }

  return [nodes, lines];
}

/**
 * 提取每个标题对应的文本内容
 *
 * 根据节点列表，提取每个标题到下一个同级或更高级标题之间的所有内容
 * 同时识别标题的级别（1-6）
 *
 * @param nodeList - extractNodesFromMarkdown返回的节点列表
 * @param markdownLines - Markdown文本的行数组
 * @returns 包含title, line_num, level, text的节点数组
 *
 * @example
 * ```ts
 * const markdown = "# Chapter 1\n\nContent\n\n## Section 1.1";
 * const [nodes, lines] = extractNodesFromMarkdown(markdown);
 * const nodesWithText = extractNodeTextContent(nodes, lines);
 * // nodesWithText[0]: { title: "Chapter 1", line_num: 1, level: 1, text: "\nContent" }
 * ```
 */
export function extractNodeTextContent(
  nodeList: Array<{node_title: string, line_num: number}>,
  markdownLines: string[]
): Array<{title: string, line_num: number, level: number, text: string}> {
  const result: Array<{title: string, line_num: number, level: number, text: string}> = [];

  for (let i = 0; i < nodeList.length; i++) {
    const node = nodeList[i];
    if (!node) continue;  // 添加空值检查

    const startLine = node.line_num - 1; // 转换为0-based索引
    const nextNode = nodeList[i + 1];
    const endLine = nextNode ? nextNode.line_num - 1 : markdownLines.length;

    // 提取标题级别
    const headingLine = markdownLines[startLine];
    if (!headingLine) continue;

    const headingMatch = headingLine.match(/^(#{1,6})\s+/);
    const level = headingMatch?.[1] ? headingMatch[1].length : 1;

    // 提取内容（不包含标题行本身）
    const content = markdownLines.slice(startLine + 1, endLine).join('\n');

    result.push({
      title: node.node_title,  // 使用node_title而不是title
      line_num: node.line_num,
      level,
      text: content,
    });
  }

  return result;
}
