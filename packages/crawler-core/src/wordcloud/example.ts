import { root } from '@sker/core';
import { Tokenizer } from './tokenizer';
import { WordCloud } from './word-cloud';
import { writeFileSync } from 'fs';

async function main() {
  const tokenizer = root.get(Tokenizer);
  const wordCloud = new WordCloud({
    width: 1200,
    height: 800,
    backgroundColor: '#1a1a2e',
    colors: ['#00d4ff', '#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf'],
    maxFontSize: 100,
    minFontSize: 20,
  });

  const sampleText = `
    人工智能技术正在改变世界，深度学习和机器学习是人工智能的核心技术。
    自然语言处理让计算机能够理解人类语言，计算机视觉让机器能够看懂图像。
    大数据分析帮助企业做出更好的决策，云计算提供了强大的计算能力。
    区块链技术保证了数据的安全性和透明度，物联网连接了万物。
    5G网络提供了更快的传输速度，量子计算将带来计算能力的革命性突破。
    人工智能在医疗、教育、金融等领域都有广泛应用。
    机器学习算法不断优化，深度学习模型越来越强大。
    自然语言处理技术让聊天机器人更加智能，计算机视觉应用于自动驾驶。
    大数据时代需要更强的数据处理能力，云计算平台提供了弹性的资源。
    区块链去中心化的特性保证了系统的安全，物联网设备产生海量数据。
  `;

  console.log('提取关键词...');
  const keywords = tokenizer.extractKeywords(sampleText, 50);
  console.log('关键词频率:', keywords.slice(0, 10));

  console.log('生成词云图...');
  const imageBuffer = wordCloud.generate(keywords);

  const outputPath = './wordcloud-example.png';
  writeFileSync(outputPath, imageBuffer);
  console.log(`词云图已保存到: ${outputPath}`);
}

main().catch(console.error);
