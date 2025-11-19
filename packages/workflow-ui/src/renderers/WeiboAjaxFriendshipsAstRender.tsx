import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { WeiboAjaxFriendshipsAst } from "@sker/workflow-ast";
import React from "react";

const WeiboAjaxFriendshipsComponent: React.FC<{ ast: WeiboAjaxFriendshipsAst }> = ({ ast }) => (
    <></>
);

@Injectable()
export class WeiboAjaxFriendshipsAstRender {
    @Render(WeiboAjaxFriendshipsAst)
    render(ast: WeiboAjaxFriendshipsAst) {
        return <WeiboAjaxFriendshipsComponent ast={ast} />;
    }
}