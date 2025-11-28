---
name: tailwindcss
description: tailwindcss 使用技巧。
---


You can choose between using CSS variables (recommended) or utility classes for theming.
```tsx
<div className="bg-background text-foreground" />
```


We use a simple background and foreground convention for colors. The background variable is used for the background color of the component and the foreground variable is used for the text color.

--primary: oklch(0.205 0 0);
--primary-foreground: oklch(0.985 0 0);

<div className="bg-primary text-primary-foreground">Hello</div>

