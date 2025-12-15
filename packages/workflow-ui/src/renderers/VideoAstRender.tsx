import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { VideoAst } from "@sker/workflow-ast";
import React, { useState, useRef, useCallback } from "react";
import { useUploadFile } from "@sker/ui/hooks/use-upload-file";
import { Button } from "@sker/ui/components/ui/button";
import { Upload, X, Download, Play, Pause, Maximize } from "lucide-react";
import { cn } from "@sker/ui/lib/utils";
import { useReactFlow } from "@xyflow/react";

/**
 * 视频节点渲染组件 - 支持播放和下载，无编辑功能
 */
const VideoComponent: React.FC<{ ast: VideoAst }> = ({ ast }) => {
    const [updateKey, setUpdateKey] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showFullscreen, setShowFullscreen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const { setNodes } = useReactFlow();

    // 更新节点数据（只更新 React Flow 状态，useWorkflow 会自动同步到 AST）
    const updateNodeData = useCallback((updates: Partial<VideoAst>) => {
        setNodes((nodes) =>
            nodes.map((node) =>
                node.id === ast.id
                    ? { ...node, data: { ...node.data, ...updates } }
                    : node
            )
        );
    }, [ast.id, setNodes]);

    const { isUploading, progress, uploadFile } = useUploadFile({
        endpoint: '/api/upload/file',
        onSuccess: (file) => {
            console.log('✅ 上传成功:', file);
            updateNodeData({ uploadedVideo: file.url });
            setUpdateKey(prev => prev + 1);
        },
        onError: (error) => {
            console.error('❌ 视频上传失败:', error);
            alert(`上传失败: ${error.message}`);
        }
    });

    const getCurrentVideo = () => {
        // uploadedVideo 可能来自：
        // 1. 用户在节点中手动上传
        // 2. 上游节点通过边传递过来
        return ast.uploadedVideo || '';
    };

    const currentVideo = getCurrentVideo();
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        console.log('📁 选择的文件:', file);

        if (!file) return;

        if (!file.type.startsWith('video/')) {
            alert('请选择视频文件');
            return;
        }

        console.log('📤 开始上传:', { name: file.name, size: file.size, type: file.type });
        await uploadFile(file);
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleDelete = () => {
        updateNodeData({ uploadedVideo: '' });
        setIsPlaying(false);
        setUpdateKey(prev => prev + 1);
    };

    const handlePlayPause = () => {
        if (!videoRef.current) return;

        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleDownload = () => {
        if (!currentVideo) return;

        const link = document.createElement('a');
        link.href = currentVideo;
        link.download = `video-${Date.now()}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFullscreen = () => {
        setShowFullscreen(true);
    };

    const handleFullscreenClose = () => {
        setShowFullscreen(false);
        if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    return (
        <div className="p-4" key={updateKey}>
            <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
            />

            {!currentVideo && !isUploading && (
                <Button
                    onClick={handleUploadClick}
                    className="w-full"
                >
                    <Upload />
                    上传视频
                </Button>
            )}

            {currentVideo && (
                <div className="space-y-2">
                    <div className="relative group">
                        <div
                            className={cn(
                                "relative border rounded-lg overflow-hidden",
                                "bg-muted/30 dark:bg-muted/10",
                                "hover:border-primary transition-colors"
                            )}
                        >
                            <video
                                ref={videoRef}
                                src={currentVideo}
                                className="w-full h-auto max-h-64 object-contain"
                                controls={false}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                onEnded={() => setIsPlaying(false)}
                            />
                        </div>

                        <Button
                            size="icon"
                            variant="destructive"
                            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={handleDelete}
                        >
                            <X className="h-3 w-3" />
                        </Button>

                        <Button
                            size="icon"
                            variant="secondary"
                            className="absolute top-2 right-10 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={handleFullscreen}
                        >
                            <Maximize className="h-3 w-3" />
                        </Button>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={handlePlayPause}
                        >
                            {isPlaying ? (
                                <>
                                    <Pause className="h-4 w-4" />
                                    暂停
                                </>
                            ) : (
                                <>
                                    <Play className="h-4 w-4" />
                                    播放
                                </>
                            )}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={handleDownload}
                        >
                            <Download className="h-4 w-4" />
                            下载
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

            {/* 全屏预览模态框 */}
            {showFullscreen && currentVideo && (
                <>
                    <div
                        className="fixed inset-0 z-[9998] bg-black/90 backdrop-blur-sm"
                        onClick={handleFullscreenClose}
                    />
                    <div className="fixed left-1/2 top-1/2 z-[9999] w-[90vw] h-[90vh] -translate-x-1/2 -translate-y-1/2 flex flex-col">
                        <div className="absolute top-4 right-4 z-10 flex gap-2">
                            <Button
                                size="icon"
                                variant="secondary"
                                onClick={handleFullscreenClose}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <video
                            src={currentVideo}
                            className="w-full h-full object-contain rounded-lg"
                            controls
                            autoPlay
                        />
                    </div>
                </>
            )}
        </div>
    );
};

@Injectable()
export class VideoAstRender {
    @Render(VideoAst)
    render(ast: VideoAst, ctx: any) {
        return <VideoComponent ast={ast} />;
    }
}
