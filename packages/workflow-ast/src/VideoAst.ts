import { Ast, Input, Node, Output } from "@sker/workflow";

/**
 * 视频节点 - 支持上传、输入、预览、播放
 *
 * 设计说明：
 * - uploadedVideo 既可以是用户上传的视频，也可以从上游节点接收视频 URL
 * - 支持通过边连接自动填充，也支持在 RunConfigDialog 中手动上传
 * - 无需编辑功能，提供播放和下载能力
 */
@Node({ title: '视频', type: 'basic' })
export class VideoAst extends Ast {
    @Input({ title: '视频', type: 'video' })
    uploadedVideo: string = '';

    @Output({ title: '视频' })
    video: string = '';

    type: 'VideoAst' = 'VideoAst';
}
