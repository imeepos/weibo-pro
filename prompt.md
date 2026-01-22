【任务】计算微博关键字爬取的开始时间和结束时间

  【输入说明】
  - startDate：事件开始时间（如 "2025-01-07T16:00:00.000Z"）
  - postMinDate：已爬取最早的帖子时间，空值表示无数据
  - postMaxDate：已爬取最晚的帖子时间，空值表示无数据

  【计算规则】
  1. 无数据时（postMinDate 为空）：endDate = 当前时间
  2. 有数据时（postMinDate 有值）：endDate = postMinDate 往前推 1 小时

  【输出格式】
  - endDate 必须是 ISO 8601 格式字符串
  - 示例：2025-01-07T15:00:00.000Z