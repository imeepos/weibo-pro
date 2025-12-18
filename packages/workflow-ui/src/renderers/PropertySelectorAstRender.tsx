import React from 'react';
import { Injectable } from '@sker/core';
import { Render, Setting } from '@sker/workflow';
import { PropertySelectorAst } from '@sker/workflow-ast';
import { Input } from '@sker/ui/components/ui/input';
import { Label } from '@sker/ui/components/ui/label';
import { KeyIcon } from 'lucide-react';

const PropertySelectorRender: React.FC<{ ast: PropertySelectorAst }> = ({ ast }) => {
  if (!ast.path) {
    return (
      <div className="p-3 text-center text-muted-foreground text-sm">
        请在属性面板中配置路径
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 max-w-sm">
      <div className="p-2 rounded-lg bg-accent/50 border border-border">
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1.5">
          <KeyIcon className="size-3" />
          属性路径
        </div>
        <div className="text-xs font-mono text-foreground bg-muted/50 px-2 py-1 rounded">
          {ast.path}
        </div>
      </div>

      {ast.value !== null && ast.value !== undefined && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            提取的值
          </div>
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
            <div className="text-xs text-foreground break-all">
              {typeof ast.value === 'object'
                ? JSON.stringify(ast.value, null, 2)
                : String(ast.value)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface PropertySelectorSettingProps {
  ast: PropertySelectorAst;
  onPropertyChange?: (property: string, value: any) => void;
}

const PropertySelectorSetting: React.FC<PropertySelectorSettingProps> = ({
  ast,
  onPropertyChange
}) => {
  const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onPropertyChange?.('path', e.target.value);
  };

  return (
    <div className="space-y-3 p-4">
      <div className="space-y-2">
        <Label htmlFor="property-path" className="text-sm font-medium">
          属性路径
        </Label>
        <Input
          id="property-path"
          type="text"
          placeholder="例如：user.profile.name"
          value={ast.path || ''}
          onChange={handlePathChange}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          支持多级路径，使用点号分隔（如：parent.key.key2）
        </p>
      </div>
    </div>
  );
};

@Injectable()
export class PropertySelectorAstRender {
  @Render(PropertySelectorAst)
  render(ast: PropertySelectorAst) {
    return <PropertySelectorRender ast={ast} />;
  }

  @Setting(PropertySelectorAst)
  setting(ast: PropertySelectorAst, handlePropertyChange?: (property: string, value: any) => void) {
    return <PropertySelectorSetting ast={ast} onPropertyChange={handlePropertyChange} />;
  }
}
