import React, { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  canonical?: string;
  structuredData?: object;
}

export const SEO: React.FC<SEOProps> = ({
  title = "Thực Vật Việt - Cơ sở dữ liệu & Tra cứu cây thuốc Nam",
  description = "Hệ thống tra cứu thông tin thực vật dược liệu Việt Nam chính xác, hiện đại với công nghệ AI hỗ trợ nhận diện và hỏi đáp.",
  image = "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80",
  canonical,
  structuredData,
}) => {
  useEffect(() => {
    // Title
    document.title = title.includes("Thực Vật Việt") ? title : `${title} | Thực Vật Việt`;

    // Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", description);

    // OpenGraph Meta
    const ogTags = [
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:image", content: image },
      { property: "og:type", content: "website" },
    ];
    ogTags.forEach(({ property, content }) => {
      let el = document.querySelector(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    });

    // JSON-LD Structured Data
    if (structuredData) {
      let script = document.querySelector('script[type="application/ld+json"]');
      if (!script) {
        script = document.createElement("script");
        script.setAttribute("type", "application/ld+json");
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(structuredData);
    }
  }, [title, description, image, canonical, structuredData]);

  return null;
};

export default SEO;
