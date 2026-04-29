import { Shield } from 'lucide-react'

export const metadata = {
  title: '隐私声明',
  description:
    'ConvertKit 隐私声明 - 所有图片和视频处理均在浏览器本地完成，不会上传到任何服务器。',
}

export default function PrivacyPage() {
  return (
    <div className="container py-10 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-8">
        <Shield className="h-6 w-6" />
        <h1 className="text-2xl font-bold">隐私声明</h1>
      </div>

      <div className="space-y-8">
        <section className="rounded-lg border p-6 bg-muted/30">
          <h2 className="text-lg font-semibold mb-3">
            你的文件压根没出过你的电脑
          </h2>
          <p className="text-muted-foreground leading-7">
            ConvertKit 所有操作都在你的浏览器里完成。
            你的图片和视频从头到尾都待在你的设备内存里，连隔壁文件夹都没去过，更别说上传到服务器了。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">
            为什么不上传？是良心发现吗？
          </h2>
          <p className="text-muted-foreground leading-7">
            倒也不全是。主要是——<strong>穷</strong>
            。服务器要钱，带宽要钱，存储要钱。
            我连个正经服务器都没有，你让我往哪儿传？
          </p>
          <p className="text-muted-foreground leading-7 mt-2">
            不过话说回来，正因为穷，你的隐私反而得到了最好的保护：
            没有服务器，就没有泄漏的可能。这大概就是传说中的「穷则独善其身」吧😭。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">底层原理</h2>
          <ul className="list-disc pl-6 text-muted-foreground leading-7 space-y-2">
            <li>全部跑在浏览器沙箱里，比你家门锁还安全</li>
            <li>图片数据只存在于浏览器内存中，关掉页面就灰飞烟灭</li>
            <li>整个过程零网络请求，你可以断网试试，照用不误</li>
            <li>没有 Cookie，没有追踪，没有广告，干净得像刚格式化的硬盘</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">我收集了什么数据？</h2>
          <p className="text-muted-foreground leading-7">
            <strong>什么都没有。</strong>
            没有注册，没有登录，没有邮箱，没有手机号。
            你来这里处理几张图片，然后拍拍屁股走人，我对此一无所知。 就算 FBI
            来问，我也只能摊手说「真不知道」。
          </p>
        </section>

        <section className="rounded-lg border p-6 bg-muted/30">
          <h2 className="text-lg font-semibold mb-3">
            总结：你很安全，因为开发者很穷
          </h2>
          <p className="text-muted-foreground leading-7">
            用就完了。放心用。你的图片比存在你自己的硬盘里还安全——
            至少硬盘还能被别人碰到，而我的服务器根本不存在。
          </p>
        </section>
      </div>
    </div>
  )
}
