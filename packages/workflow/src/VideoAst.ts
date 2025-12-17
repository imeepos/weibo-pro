import { Ast } from "./ast";
import { Input, Node, Output } from "./decorator";

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
    @Input({ title: '视频', type: 'video', defaultValue: '' })
    uploadedVideo: string = '';
    // 注意：不使用BehaviorSubject
    @Output({ title: '视频', defaultValue: '' })
    video = ``;

    type: 'VideoAst' = 'VideoAst';
}
