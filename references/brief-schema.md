# 需求与人物确认格式
brief.json 仍包含三张不同参考图、读图观察、人物、设计、全部文案、交互与交付。新增必填字段：
- people.proportions：头身比及面部风格，默认建议约3头身。
- people.stickerTreatment：白色轮廓、柔和阴影、轻微悬浮等约定。
- design.density：充盈程度、允许补充的元素类别和不能遮挡区域。

需求验证：
`node scripts/validate-card.mjs brief <brief.json>`
用户明确批准需求后，才填写 approval.confirmed/userQuote/confirmedAt/briefSha256。此时只能生成人物预览，不能创建网页项目。

人物生成后：
`node scripts/prepare-character-review.mjs <brief.json> <新review.json> <人物PNG> [其他人物PNG]`

脚本记录当前方案摘要、每张PNG的绝对路径与字节摘要，approval 默认为 null；输出 reviewSha256。此命令只做记录，不生成网页。展示所有人物素材，再等待用户明确确认具体版本。
收到确认后，将 review.approval 填为：
{"confirmed":true,"userQuote":"真实用户确认原话","confirmedAt":"实际ISO时间","reviewSha256":"当前脚本输出摘要"}

核验：
`node scripts/validate-card.mjs character <review.json> <brief.json>`
`node scripts/validate-card.mjs character-approved <review.json> <brief.json>`
前者仅返回待审摘要，后者要求真实确认记录。严禁把输出摘要当作自动授权。

创建：
`node scripts/create-project.mjs <brief.json> <不存在的新项目目录> <已确认review.json>`
脚本复制获批的图片为 assets/subjects-1.png 等并写入映射。多个获批素材的默认位置会重叠，制作时必须按确认的构图调整；不允许丢弃任何已确认主体。人物可以是一张含多个角色的群像。

配置 card.json：copy/interactions 必须匹配已确认需求；layers 含 name/source/x/pivot/width/height。至少一个主角 name=family，其余可用 subject-2 等。背景放 assets/background.png，装饰素材按主题生成或使用匹配风格的 SVG。默认600×440；更换尺寸需同步修改模板/验证器。素材相对路径不得包含引号、尖括号、& 或反斜杠。

验证与打包：
`node scripts/validate-card.mjs project <目录>`
`node scripts/bundle-card.mjs <目录> <新的输出.html>`

人物路径映射与字节必须匹配审批记录，模板实际使用同一配置图层，不得旁路注入未确认人物图。无人物审批的旧项目会拒绝打包；不要绕过，先展示并确认具体人物素材。重新生成人物会使人物审批失效；需求实质改变还需重新确认需求。位置/缩放等不改变人物图片的技术调整不需重生成。

批准记录仅为防错，不是身份认证。不得编造用户原话。项目输出不嵌入参考照片或批准记录。成品 HTML 可离线打开。
