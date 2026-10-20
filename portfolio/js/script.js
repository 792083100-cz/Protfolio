// ===== 加载动画 =====
window.addEventListener("load", () => {
  const loader = document.getElementById("loader");
  setTimeout(() => loader.classList.add("hidden"), 500);
});

// ===== 滚动处理 =====
const progressBar = document.getElementById("scrollProgress");
const navbar = document.getElementById("navbar");
const sections = document.querySelectorAll("section[id], header[id]");
const navItems = document.querySelectorAll(".nav-link");
const sectionDots = document.querySelectorAll(".section-dot");

let ticking = false;

function updateScroll() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  progressBar.style.width = progress + "%";

  if (scrollTop > 50) {
    navbar.classList.add("scrolled");
  } else {
    navbar.classList.remove("scrolled");
  }

  let current = "";
  sections.forEach((section) => {
    const sectionTop = section.offsetTop - 100;
    if (scrollTop >= sectionTop) {
      current = section.getAttribute("id");
    }
  });

  navItems.forEach((item) => {
    item.classList.remove("active");
    if (item.getAttribute("href") === "#" + current) {
      item.classList.add("active");
    }
  });

  if (scrollTop + window.innerHeight >= document.documentElement.scrollHeight - 2) {
    current = sections[sections.length - 1].id;
  }
  sectionDots.forEach((dot) => {
    const active = dot.getAttribute("href") === "#" + current;
    dot.classList.toggle("active", active);
    if (active) dot.setAttribute("aria-current", "location");
    else dot.removeAttribute("aria-current");
  });

  ticking = false;
}

window.addEventListener("scroll", () => {
  if (!ticking) {
    requestAnimationFrame(updateScroll);
    ticking = true;
  }
}, { passive: true });
window.addEventListener("load", updateScroll);
window.addEventListener("resize", updateScroll);
updateScroll();

// ===== 移动端菜单 =====
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

menuToggle.addEventListener("click", () => {
  const isOpen = menuToggle.classList.toggle("open");
  navLinks.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", isOpen);
  menuToggle.setAttribute("aria-label", isOpen ? "关闭菜单" : "打开菜单");
});

navItems.forEach((link) => {
  link.addEventListener("click", () => {
    menuToggle.classList.remove("open");
    navLinks.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "打开菜单");
  });
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (navLinks.classList.contains("open")) {
      menuToggle.classList.remove("open");
      navLinks.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "打开菜单");
      menuToggle.focus();
    }
    closeModal();
  }
});

// ===== 滚动渐显 =====
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  },
  { threshold: 0.15 }
);

document.querySelectorAll(".section").forEach((el) => {
  el.classList.add("reveal");
  observer.observe(el);
});

// ===== 项目详情弹窗 =====
const projectData = {
  flicker: {
    tags: ["AI 专家", "交互设计", "知识库"],
    title: "My Flicker - AI 专家",
    subtitle: "AI 工作台体验设计",
    sections: [{
      heading: "运营设计",
      body: ["围绕AI工作台使用场景开展问卷、量表、用户访谈与体验走查，识别专家理解、配置及调用中的关键阻塞点；梳理 AI 专家、知识库核心交互、功能架构与任务流程，并协同产品、研发推动方案落地。"]
    }]
  },
  other: {
    tags: ["运营设计", "设计系统", "Vibe Coding"],
    title: "品牌运营设计",
    subtitle: "品牌运营与 AI 设计系统",
    sections: [
      { heading: "运营设计", body: ["基于网盘品牌年轻化建设，借助S级品牌活动助力产品拉新，增强用户品牌认知。"] },
      { heading: "设计系统建设", body: ["搭建面向 AI 生成与 Vibe Coding 的设计系统，封装成skills，覆盖10+业务场景。"] }
    ]
  },
  designSystem: {
    tags: ["AI 设计系统", "Vibe Coding"],
    title: "AI可用的设计系统搭建",
    subtitle: "面向 AI 编码场景的设计系统建设",
    sections: [
      { heading: "项目实践", body: ["构建面向 AI 编码场景的设计系统，沉淀可复用的设计规范与组件能力，支持团队更高效地完成设计交付。"] },
      { heading: "项目成果", body: ["提升团队设计交付效率 30%，减少 20% 咨询人力成本，落地 30 余项体验迭代。"] }
    ]
  },
  travel: {
    tags: ["APP设计", "UX/UI", "AI行程规划", "改版升级"],
    title: "圆周旅迹 APP",
    subtitle: "Pi Travel — 个性化便捷行程规划工具",
    sections: [
      {
        heading: "项目背景",
        body: [
          "圆周旅迹是一款个性化便捷行程规划工具，支持链接解析、创新行程规划、地图模式、行程清单及分享功能。以 V3.3 版本为例，原版存在智能推荐「不太懂我」、界面操作繁琐、记录门槛偏高、缺乏情感连接等问题。",
          "本次改版围绕用户需求优化核心模块与视觉体验，引入 AI 实现行程的智能生成与灵活调整，提升规划效率与准确性，推动用户转化与价值提升。"
        ]
      },
      {
        heading: "用户痛点",
        list: [
          "智能推荐千篇一律，无法满足个性化需求",
          "带爸妈出行却推荐爬山路线，推荐不精准",
          "多人协作困难，无法与旅伴共同编辑",
          "地点顺序调整困难，行程灵活性不足",
          "功能不能覆盖旅行全流程，缺失辅助功能",
          "记录门槛偏高，输入负担过重",
          "图片空间仅停留在「堆图」层面，缺乏情感连接"
        ]
      },
      {
        heading: "核心优化",
        list: [
          "强化偏好关联：新增出发地智能识别，支持关键词联想匹配，减少手动输入成本",
          "新增出行需求定向选择题库：通过标准化选项（同行伙伴、旅行偏好、行程节奏、人均消费等）提升行程创建效率与准确性",
          "智能路书推荐：结合智能路线优化与个性化景点推荐，提供多份精选完整路书，增加推荐理由与预算预估",
          "交互优化：支持左右手势滑动切换路书卡片，单击与下拉实现卡片与详情间自动切换",
          "视觉升级：采用轻微弥散渐变背景，搭配悬浮动作按钮，层次清晰、主题突出"
        ]
      },
      {
        heading: "功能模块",
        list: [
          "首页推荐：精选行程卡片、热门目的地、个性化推荐",
          "行程创建：AI 智能规划 + 手动创建线路双模式",
          "路书详情：日程安排、行李清单、出行物品、编辑路线",
          "地图模式：洞察地图视角，支持多人协作",
          "行程分享：分享旅行指南，探索世界更融合"
        ]
      },
      {
        heading: "页面展示",
        body: [
          "完整覆盖首页 ToB 学习页面、表达爱 ToB 页面、商城 ToB 页面、设备 ToB 页面及部分二级页面，共计 30+ 页面设计。"
        ]
      }
    ]
  },
  lumi: {
    tags: ["APP设计", "0-1搭建", "情绪关怀", "可穿戴设备"],
    title: "LUMI CARE APP",
    subtitle: "从 0 到 1 打造的情绪关怀产品",
    sections: [
      {
        heading: "项目概述",
        body: [
          "LUMI CARE 是一款情绪关怀项目，从 0 到 1 完整设计。过程中按照「业务场景—角色需求—功能呈现—设计思考」的流程展开，根据用户痛点，提炼关键场景与核心功能，最终打造可持续陪伴用户情绪成长的产品体验。"
        ]
      },
      {
        heading: "设计理念",
        body: [
          "品牌主张：活力（Vitality）、超越（Transcend）、愉悦（Pleasure）。通过可穿戴设备连接，实时监测用户生理与情绪状态，提供个性化的情绪调节方案。"
        ]
      },
      {
        heading: "功能架构",
        list: [
          "今日模块：今日平均 HRV、静息心率、可视化数据、心情监测、状态解读、手表连接、好友关联、健康科普",
          "调节模块：每日语录、行为引导、专注引导、情绪匹配个性推荐、冥想推荐、播客推荐",
          "目标模块：目标看板、自定义目标、目标进度展示、目标节奏调整、回顾、装饰收集、目标预设、主题活动",
          "洞察模块：历史数据（周度/月度/年度）"
        ]
      },
      {
        heading: "核心特色",
        list: [
          "通过 HRV（心率变异性）等生理指标科学监测情绪状态",
          "情绪匹配的个性化内容推荐（冥想、播客、语录）",
          "目标系统结合装饰收集与主题活动，增强用户粘性",
          "好友关联功能，支持社交化情绪关怀体验"
        ]
      }
    ]
  },
  baidu: {
    tags: ["运营设计", "品牌IP", "品牌年轻化", "3D视觉"],
    title: "百度网盘 · 星愿派对",
    subtitle: "百度网盘会员中心运营活动设计",
    sections: [
      {
        heading: "项目背景",
        body: [
          "基于网盘品牌升级（品牌年轻化建设），借助 S 级品牌活动助力产品拉新。希望通过设计将百度网盘的产品价值精准传递给用户，增强用户品牌认知，提升用户留存及会员转化。",
          "该作品是百度网盘会员中心运营活动，旨在提升会员中心用户活跃度，建立系列化视觉语言和产品认知，打造会员中心品牌 IP 化，增强用户对会员身份的认同感。"
        ]
      },
      {
        heading: "关键词理念",
        list: [
          "年轻 — 面向年轻用户群体的视觉语言",
          "炫酷 — 赛博朋克风格的 3D 视觉呈现",
          "超级 VIP 云一朵 — 品牌 IP 形象主题化延展"
        ]
      },
      {
        heading: "视觉色彩",
        body: [
          "主色：紫色渐变（#9B5DE5 → #C77DFF），传递科技感与未来感",
          "辅色 1：珊瑚橙（#FF6B6B → #FF8E53），用于 CTA 与高亮元素",
          "辅色 2：电光蓝（#4CC9F0），用于科技元素与光效",
          "中性色：白色（#FFFFFF / #F8F9FA），用于文字与亮色元素"
        ]
      },
      {
        heading: "IP 主题延展",
        body: [
          "基于百度网盘品牌 IP 形象「云一朵」进行主题化设计，结合星愿派对活动主题进行创意延展。对云一朵基础造型进行延展，造型动态上更加活力，同时对服装进行延展（橙色夹克、墨镜、耳机），使其符合派对活动氛围。"
        ]
      },
      {
        heading: "主视觉展示",
        body: [
          "采用 3D 渲染风格，构建未来感城市景观。云一朵化身派对 DJ / 星愿守护者，置身于霓虹灯闪烁的赛博朋克都市中，配合 SVIP 品牌标识与粒子光效，打造年轻、炫酷的视觉冲击力。"
        ]
      }
    ]
  },
  snack: {
    tags: ["品牌设计", "VI系统", "Logo设计", "品牌策略"],
    title: "无国界小吃 DUOMIAN MIX",
    subtitle: "DUOMIAN MIX FUSION SNACKS — 多国创新美食融合品牌",
    sections: [
      {
        heading: "品牌主张",
        body: [
          "「多面」指多个国家小吃，MIX 是融合的意思，结合在一起即为世界各地小吃集合一家——无国界小吃。一样的时间，一样的消费，品尝多样的美食，即为「美味不止一面」。",
          "年轻的风格，创新的餐品，给愿意打卡尝试不同国家小吃的人们一个独特的体验。"
        ]
      },
      {
        heading: "品牌印象",
        list: [
          "核心卖点：多国创新美食融合一家",
          "目标人群：对世界各国小吃感兴趣的年轻群体",
          "品牌调性：活力 · 创见 · 愉悦"
        ]
      },
      {
        heading: "Logo 设计理念",
        body: [
          "灵感来源于几何体与好友逛街的场景——每个人都独特的一面，都有自己的色彩，就如同美食一般，每个国家都有不同的风味。不同的人与不同的色彩都聚集在了这里，享受快乐与活力。",
          "三个几何角色（圆形·绿色、菱形·肤色、方形·紫色）以同步行走的姿态排列，象征多元融合与前行动力。"
        ]
      },
      {
        heading: "视觉系统",
        list: [
          "主 Logo：多面 MIX + 三角色行走图形",
          "辅助图形：圆形印章「DUOMIAN MIX FUSION CUISINE」",
          "色彩体系：绿色（活力/新鲜）、肤色（温暖/人文）、紫色（创意/高端）",
          "应用延展：品牌名组合、图标 + 文字横排、辅助图形等多种使用场景"
        ]
      },
      {
        heading: "品牌形象设计",
        body: [
          "以生动有趣的形象打动消费者。通过 TASTY、HAPPY、SAVOR 三个关键词构建品牌情感连接，将抽象的「融合」概念转化为亲切可感的角色形象。"
        ]
      }
    ]
  }
};

const modalOverlay = document.getElementById("modalOverlay");
const modalBody = document.getElementById("modalBody");
const modalClose = document.getElementById("modalClose");

function openModal(projectKey) {
  const data = projectData[projectKey];
  if (!data) return;

  let html = '<div class="modal-header">';
  html += '<div class="modal-tags">';
  data.tags.forEach((tag) => {
    html += `<span class="work-tag">${tag}</span>`;
  });
  html += "</div>";
  html += `<h3 class="modal-title">${data.title}</h3>`;
  html += `<p class="modal-subtitle">${data.subtitle}</p>`;
  html += "</div>";

  data.sections.forEach((section) => {
    html += `<div class="modal-section">`;
    html += `<h4>${section.heading}</h4>`;
    if (section.body) {
      section.body.forEach((p) => {
        html += `<p>${p}</p>`;
      });
    }
    if (section.list) {
      html += "<ul>";
      section.list.forEach((item) => {
        html += `<li>${item}</li>`;
      });
      html += "</ul>";
    }
    html += "</div>";
  });

  modalBody.innerHTML = html;
  modalOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modalOverlay.classList.remove("open");
  document.body.style.overflow = "";
}

document.querySelectorAll(".work-card[data-project]").forEach((card) => {
  card.addEventListener("click", () => {
    const project = card.getAttribute("data-project");
    openModal(project);
  });
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openModal(card.getAttribute("data-project"));
    }
  });
});

modalClose.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});

