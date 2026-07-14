# 07｜改进RAG应用：诊断调试和支持Java、.NET的MIS系统

你好，我是叶伟民。

上一节课我们完成了实战案例 1 的代码。然而这只是个 demo，如果要支持更多的用例，支持更多的模块，我们需要添加更多选项序号和提示。

但是这又会引起一个新问题，用户在用我们系统的时候，你并没有在旁边看着，你怎么知道如何添加这些内容呢？你又怎么知道如何改进呢？

这就是我们今天要讨论的主题——诊断与调试。我们先开始第一步，查看用户的提问。

## 查看用户的提问

前面我们已经把对话记录保存在数据库里面了。现在，我们只需要在管理员界面添加相关模块就可以查看它们了。

### 启用管理员界面

首先，我们需要启用管理员界面。

我们打开**实战案例 1\改造前\mysite\urls.py** 文件。然后把第 7 行的注释取消掉。

```
from django.contrib import admin
from django.urls import include, path
app_name = "home"
urlpatterns = [
    path('', include('home.urls')),
    path('admin/', admin.site.urls),
]
```

然后重新运行，打开浏览器，导航到 [http://127.0.0.1:8000/admin]()。将会出现以下界面。

![](assets/20260512-809016-01-头图.jpg)

然后我们还需要添加管理员，设置管理员密码，才能登录管理员界面。

### 添加管理员

我们回到 **Anaconda Powershell Prompt**。按 ctrl+c 停止运行，然后输入以下命令。

```
python manage.py createsuperuser
```

这时将会出现以下提示。

![](assets/20260512-809016-02-图片1.jpg)

我们输入 admin。然后在接下来的 Email Address 输入 “admin@admin.com”。

Password 和 Password(again) 都输入 admin。如果需要跳过密码验证这一步，这里输入 y。

如果一切顺利，将会提示超级用户创建成功。

![](assets/20260512-809016-03-图片2.jpg)

然后我们重新运行，打开浏览器，导航到[http://127.0.0.1:8000/admin]()。用户名输入 admin，密码输入 admin，点击登录。

然后我们将会看到如下界面。

![](assets/20260512-809016-04-图片3.jpg)

### 在管理员界面添加对话记录模块

不过，现在这个管理员界面并没有地方可以查看对话记录。我们还需要在管理员界面添加对话记录模块。

我们打开实战案例 1\改造前\home\admin.py 文件。在文件尾部添加以下代码。

```
from .models import 对话记录
class 对话记录Admin(admin.ModelAdmin):
    ordering = ["created_time"]
    list_display = ['已结束','created_time','不带入大模型对话中','role', 'content', '处理后content','提交给大模型的payload']
    search_fields = ['已结束']
    list_filter = ('已结束',)
admin.site.register(对话记录, 对话记录Admin)
```

这段代码很好理解，其中第 1 行导入对话记录模型。第 3 行到第 7 行声明了对话记录模块在管理员界面里面的表现方式。第 9 行将对话记录模块注册到了管理员界面。

添加完刚才的代码，我们重新运行，打开浏览器登录管理员界面。这时将会看到以下界面。

![](assets/20260512-809016-05-图片4.jpg)

点击“对话记录”来链接之后，我们可以看到后面这几项内容。

首先是用户的对话记录。

![](assets/20260512-809016-06-图片5.jpg)

然后是大模型返回的结构化结果和 AI 处理后的结果。

![](assets/20260512-809016-07-图片6.jpg)

另外还有提交给大模型的 payload。

![](assets/20260512-809016-08-图片7.jpg)

细心的同学可能会注意到，提交给大模型的 payload 里面的文字是乱码，这样是否会影响到调试和诊断呢？

实际上，我们并不需要查看这些文字，我一般只关心 payload 里面有多少条 messages，前面的内容在提交时有没有遗漏。如果你一定要查看，网上有很多 unicode 转中文的小工具，自行搜索一下就会发现很多。

现在我们可以根据前面这些信息来改进我们的 RAG 质量。和我们上节课讲的一样，如果示例不够多，那就加示例；如果对大模型结果做的进一步处理不到位，那就加上对应代码；如果大模型还是出现其他意外，那就参考之前[第五节课“]()让大模型不要那么啰嗦”一节中所说的，添加更多指令。

讲到这里，我们实战案例 1 的相关代码都讲解完了。但是目前的代码还很乱。因此，我们需要整理一下代码。

## 整理一下代码

我们可以使用 python 的 region 关键词将同一类型的函数归类到一起。我们用 VSCode 打开项目以后，就可以使用 ctrl+shift+a 快捷键把

**rag.py 文件**的代码按 region 折叠。这时代码将会变成后面这样。

![](assets/20260512-809016-09-图片8.jpg)

你可以在[这里]()查看完整的 rag.py 代码。另外，我们会在这门专栏的最后一节课使用 AI 帮助我们认真的重构代码。

## 如何将本实战案例代码重用到你的 MIS 系统？

这里还有一个问题，有很多 MIS 系统并非使用 Python 编写，而是使用 Java 或.NET 编写。那么如何将本实战案例的代码重用到你的 MIS 系统呢？

其中一个方案是将这个实战案例的代码从 Python 改成 Java 或.NET。然而 AI 基本是 Python 的世界，要想在 AI 的大道上走得更远，我并不建议你采用这个方案。

还有一个方案就是将现有的 MIS 系统从 Java 或.NET 全部改成 Python。这个方案工程量实在是太大，风险实在是太高。我也不建议你采用这个方案。

另一个方案是将这个实战案例的功能开放成 API 接口，提供给现有的 MIS 系统调用。这个方案是比较可行的，我们现在就来动手做做！

### 新增接口

我们在**实战案例 1\改造后\home** 目录下新增一个文件，命名为 **views_api.py**。然后添加后面的代码。

```
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core import serializers
from .rag import *
def 开始新的对话api(request):
    开始新的对话()
    return JsonResponse({"code":200,"message":"已经成功开始新的对话"})
@csrf_exempt
def 获取结构化数据查询参数api(request):
    用户输入 = request.POST['question']
    查询参数 = 获取结构化数据查询参数(用户输入)
    return JsonResponse({"querydata":查询参数})
def 从数据库查不到相关数据时的操作api(request):
    从数据库查不到相关数据时的操作()
    return JsonResponse({"code":200,"message":"已经成功执行从数据库查不到相关数据时的操作"})
@csrf_exempt
def 根据查询结果回答用户输入api(request):
    用户输入 = request.POST['question']
    查询结果 = request.POST['query-result']
    根据查询结果回答用户输入(查询结果,用户输入)
    return JsonResponse({"code":200,"message":"已经成功根据查询结果回答用户输入"})
def 获取对话记录api(request):
    conversation_list = 获取当前对话记录()
    conversation_list_json = serializers.serialize("json", list(conversation_list))
    return JsonResponse({"conversationlist":conversation_list_json})
```

以上代码总共有 5 个接口，接口的功能都是我们之前接触过的。

除了新增接口，我们还需要修改 rag.py 和 views.py 文件。

第一处要修改的是**开始新的对话**函数。原因是 views_api.py 和 views.py 都重用了这个函数。首先我们打开 views.py 文件，将 newtalk 函数修改成以下模样。

```
def newtalk(request):
    开始新的对话()
    return redirect(reverse('home:index'))
```

现在我们看到，第 2 行代码已经和接口文件里面的代码一样了。

然后打开 rag.py 文件，在文件尾部新增这个函数。

```
def 开始新的对话():
  未结束的对话 = 对话记录.objects.filter(已结束=False)
  for current in 未结束的对话:
      current.已结束 = True
  对话记录.objects.bulk_update(未结束的对话, ['已结束'])
```

其实就是将这段原来在 views.py 文件的代码移到了 rag.py 文件，从而让 views_api.py 和 views.py 能够共用它。

第二处是将获取当前对话记录的代码从 views.py 文件移到了 rag.py 文件，从而让 views_api.py 和 views.py 共用它。也就是说，我们首先需要在 rag.py 文件尾部新增这个函数。

```
def 获取当前对话记录():
  return 对话记录.objects.filter(已结束=False).order_by('created_time')
```

然后将 views.py 文件的 index 函数改成如下模样。

```
def index(request):
    if request.method == 'POST':
        用户输入 = request.POST['question']
        查询参数 = 获取结构化数据查询参数(用户输入)
        查询结果 = None
        if 查询参数 is not None:
            查询结果 = 查询(查询参数)
        if 查询结果 is None:
            从数据库查不到相关数据时的操作()
        else:
            查询结果json格式 = serializers.serialize("json", list(查询结果))
            根据查询结果回答用户输入(查询结果json格式,用户输入)
    conversation_list = 获取当前对话记录()
    return render(request, "home/index.html",{"object_list":conversation_list})
```

第 16 行就是我们修改的地方。

然而细心的同学会发现，第 13 行也有变化。是的，这就是我们第三处需要修改的地方，把我们这个 Python MIS 系统才支持的功能从 rag.py 文件移出来。

我们需要打开 rag.py 文件，把将查询结果转为字符串函数修改成以下模样。

```
def 将查询结果转为字符串(查询结果):
  return_str = ""
  data = json.loads(查询结果)
  for current in data:
    if 'fields' in current:
      for key, value in current['fields'].items():
        return_str += f"{key}：{value}\n"
    else:
      for key, value in current.items():
        return_str += f"{key}：{value}\n"
  return return_str
```

我们可以看到，其实就是把原来的第 2 行代码从 rag.py 文件移到了 views.py 文件的 index 函数。

现在我们已经编写完 API 接口了，我们还需要注册这些接口，才能让外部调用它们。

### 注册接口

我们打开 **home\urls.py** 文件，在第 11 行之前插入以下代码。

```
path("api/new-talk", views_api.开始新的对话api, name="api-new-talk"),
path("api/get-query-paras", views_api.获取结构化数据查询参数api, name="api-get-query-paras"),
path("api/answer-without-data", views_api.从数据库查不到相关数据时的操作api, name="api-answer-without-data"),
path("api/answer-with-data", views_api.根据查询结果回答用户输入api, name="api-answer-with-data"),
path("api/get-conversation-list", views_api.获取对话记录api, name="api-get-conversation-list"),
```

### 测试接口

现在我们已经注册完接口了，我们重新运行，然后测试接口。

这里需要我们打开 postman，输入以下接口 url、提交方法和提交数据。然后进行测试。

![](assets/20260512-809016-10-图片9.jpg)

需要注意的是，**在测试第 2 和第 5 个接口时，我们的 key 和 value 是需要添加 body 里面的，并且数据提交类型下拉列表要选 form-data。**

![](assets/20260512-809016-11-图片10.jpg)

完成这些操作后，你的 Java 或者.NET MIS 系统就能通过以上接口调用我们的实战案例了。

至此，我们的实战案例 1 就结束了。完整的代码可以在[这里]()下载。

希望你通过这个实战案例能够说服你的利益相关者，说服他支持改造现有的 MIS 系统，从而真正进入生成式 AI 这条热门赛道。

## 小结

好了，今天这一讲到这里就结束了，最后我们来回顾一下。这一讲我们学会了两件事情。

第一件事情是通过查看用户的提问来改进我们的 RAG 应用。我们可以在管理员界面查看用户的提问，借此改进我们的 RAG 应用。

第二件事情是如何将实战案例 1 的代码重用到你的 MIS 系统。我们可以把 rag.py 文件里面的函数包装成 http 接口对外开放，这样你的 MIS 系统可以通过调用这些 http 接口来实现 RAG 功能了。

## 思考题

为了教学方便，代码中的数据库字段都是使用中文，但是实际工作中基本是英文，所以传给大模型的都会是英文而不是中文，如何处理这个问题？

欢迎你在留言区和我交流互动，如果这节课对你有启发，也推荐分享给身边更多朋友。

---
来源：极客时间
链接：https://time.geekbang.org/column/article/809016
日期：2026-05-12
