import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { VideoAst } from "@sker/workflow-ast";
import React, { useState, useRef } from "react";
import { useUploadFile } from "@sker/ui/hooks/use-upload-file";
import { Button } from "@sker/ui/components/ui/button";
import { Upload, X, Download, Play, Pause } from "lucide-react";
import { cn } from "@sker/ui/lib/utils";

/**
 * 视频节点渲染组件 - 支持播放和下载，无编辑功能
 */
const VideoComponent: React.FC<{ ast: VideoAst }> = ({ ast }) => {
    const [updateKey, setUpdateKey] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const { isUploading, progress, uploadFile } = useUploadFile({
        endpoint: '/api/upload/file',
        onSuccess: (file) => {
            console.log('✅ 上传成功:', file);
            ast.uploadedVideo = file.url;
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

    console.log('🎬 当前渲染状态:', {
        currentVideo,
        uploadedVideo: ast.uploadedVideo,
        isUploading,
        updateKey
    });

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
        ast.uploadedVideo = '';
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
