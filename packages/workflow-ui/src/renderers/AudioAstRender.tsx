import { Injectable, root } from "@sker/core";
import { Render } from "@sker/workflow";
import { AudioAst } from "@sker/workflow";
import React, { useRef, useState, useCallback } from "react";
import { UploadController } from "@sker/sdk";
import { Button } from "@sker/ui/components/ui/button";
import { Upload, X, Download } from "lucide-react";
import { cn } from "@sker/ui/lib/utils";
import { useReactFlow } from "@xyflow/react";

const AudioComponent: React.FC<{ ast: AudioAst }> = ({ ast }) => {
    const [updateKey, setUpdateKey] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { setNodes } = useReactFlow();

    // 更新节点数据（只更新 React Flow 状态，useWorkflow 会自动同步到 AST）
    const updateNodeData = useCallback((updates: Partial<AudioAst>) => {
        setNodes((nodes) =>
            nodes.map((node) =>
                node.id === ast.id
                    ? { ...node, data: { ...node.data, ...updates } }
                    : node
            )
        );
    }, [ast.id, setNodes]);

    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const uploadFile = useCallback(async (file: File) => {
        setIsUploading(true);
        setProgress(0);

        try {
            const controller = root.get(UploadController);
            const formData = new FormData();
            formData.append('file', file);

            const result = await controller.uploadFile(formData);
            console.log('✅ 上传成功:', result);
            updateNodeData({ uploadedAudio: result.url });
            setUpdateKey(prev => prev + 1);
        } catch (error) {
            console.error('❌ 音频上传失败:', error);
            alert(`上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
        } finally {
            setIsUploading(false);
            setProgress(0);
        }
    }, [updateNodeData]);

    const currentAudio = ast.uploadedAudio || '';

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('audio/')) {
            alert('请选择音频文件');
            return;
        }

        await uploadFile(file);
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleDelete = () => {
        updateNodeData({ uploadedAudio: '' });
        setUpdateKey(prev => prev + 1);
    };

    const handleDownload = () => {
        if (currentAudio) {
            const link = document.createElement('a');
            link.href = currentAudio;
            link.download = `audio-${Date.now()}.mp3`;
            link.click();
        }
    };

    return (
        <div className="p-4" key={updateKey}>
            <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="hidden"
            />

            {!currentAudio && !isUploading && (
                <Button
                    onClick={handleUploadClick}
                    className="w-full"
                >
                    <Upload />
                    上传音频
                </Button>
            )}

            {currentAudio && (
                <div className="space-y-3">
                    <div
                        className={cn(
                            "relative border rounded-lg overflow-hidden p-3",
                            "bg-muted/30 dark:bg-muted/10"
                        )}
                    >
                        <audio
                            controls
                            src={currentAudio}
                            className="w-full"
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleDownload}
                            className="flex-1"
                        >
                            <Download className="h-4 w-4" />
                            下载
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleDelete}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {isUploading && (
                <div className="space-y-2">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                        上传中... {progress}%
                    </p>
                </div>
            )}
        </div>
    );
};

@Injectable()
export class AudioAstRender {
    @Render(AudioAst)
    render(ast: AudioAst, _ctx: any) {
        return <AudioComponent ast={ast} />;
    }
}
