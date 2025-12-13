## 需求


开发一个指定工作流的节点选择器

@sker/ui/components/blocks 仅样式，接口调用逻辑抽离到使用测


## 子包的作用 

@sker/workflow-ast 节点定义
@sker/workflow-run 服务端运行
@sker/workflow-browser 浏览器运行
@sker/workflow-ui 前端UI，特殊设置使用@Setting
@sker/ui 通用组件


## 最佳实践

```ts
// 类型复用
import type { PromptSkillEntity, PromptSkillType, PromptResourceScope } from '@sker/entities';
```
分页使用： @sker/ui/components/ui/simple-pagination

- 选择器-统一使用 Dialog + Command 的方式实现
```tsx
// 标准选择器封装
<div>
   <label className="text-sm text-muted-foreground mb-2 block">选择技能</label>
   <div className="relative">
      <button
      onClick={() => setSkillSearchOpen(true)}
      className="w-full rounded-md border bg-background px-3 py-2 text-sm text-left flex items-center justify-between hover:bg-muted/50"
      >
      <span className={selectedSkill ? '' : 'text-muted-foreground'}>
         {selectedSkill ? (
            <span>
            {selectedSkill.title}
            <span className="ml-2 text-xs text-muted-foreground">
               ({SKILL_TYPES.find(t => t.value === selectedSkill.type)?.label})
            </span>
            </span>
         ) : '点击选择技能...'}
      </span>
      <svg className="size-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
      </svg>
      </button>

      {/* Command 弹窗 */}
      <Dialog open={skillSearchOpen} onOpenChange={setSkillSearchOpen}>
      <DialogContent className="max-w-md p-0">
         <Command className="rounded-lg border">
            <CommandInput placeholder="搜索技能..." />
            <CommandList className="max-h-[400px]">
            <CommandEmpty>未找到技能</CommandEmpty>
            {SKILL_TYPES.map(type => {
               const skillsOfType = groupedAvailableSkills[type.value] || [];
               if (skillsOfType.length === 0) return null;

               return (
                  <CommandGroup key={type.value} heading={type.label}>
                  {skillsOfType.map(skill => (
                     <CommandItem
                        key={skill.id}
                        value={`${skill.title} ${skill.name}`}
                        onSelect={() => {
                        setBindForm({ ...bindForm, skill_id: skill.id });
                        setSkillSearchOpen(false);
                        }}
                        className="flex items-center justify-between"
                     >
                        <div className="flex-1">
                        <div className="font-medium">{skill.title}</div>
                        <div className="text-xs text-muted-foreground">{skill.name}</div>
                        {skill.description && (
                           <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {skill.description}
                           </div>
                        )}
                        </div>
                        {bindForm.skill_id === skill.id && (
                        <CheckIcon className="size-4 ml-2 shrink-0" />
                        )}
                     </CommandItem>
                  ))}
                  </CommandGroup>
               );
            })}
            </CommandList>
         </Command>
      </DialogContent>
      </Dialog>
   </div>
</div>
```

## 说明

1. 前端项目：apps\bigscreen 使用@sker/ui + @sker/sdk 组装成页面或业务组件 @sker/bigscreen
2. 后端接口：apps\api 实现@sker/sdk定义的Controller @sker/api
3. SDK封装：packages\sdk 定义接口输入输出格式 @sker/sdk
4. 组件封装：packages\ui（纯样式+布局）@sker/ui 
   1. @sker/ui/components/blocks 组装简单的组件为复杂组件
   2. @sker/ui/components/ui 简单组件
   3. @sker/ui/components/workflow 工作流组件
   4. @sker/ui/components/weibo 微博相关组件
   5. @sker/ui/components/mobile 手机端组件
   6. @sker/ui/components/editor 富文本编辑器组件
5. 数据库表结构：packages\entities 定义数据库表结构 @sker/entities

只实现用到的，不要有多余的代码，保持简单美