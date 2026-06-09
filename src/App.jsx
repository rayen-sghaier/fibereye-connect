import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Cable,
  Camera,
  CheckCircle2,
  CircleAlert,
  Database,
  Download,
  Edit3,
  Eye,
  HardDrive,
  Headphones,
  Inbox,
  Loader2,
  Lock,
  LogOut,
  MapPinned,
  MessageCircle,
  PackageCheck,
  Plus,
  RefreshCcw,
  Router,
  Save,
  Send,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  UploadCloud,
  Wrench,
  Wifi,
  Zap
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const ADMIN_ROUTE = "fibereye-admin";

const defaultSettings = {
  brandName: "FIBEREYE CONNECT",
  tagline: "Telecom & CCTV Solutions",
  whatsappNumber: "21694239300",
  whatsappDisplay: "+216 94 239 300",
  instagramUrl: "https://www.instagram.com/fibereyeconnect/",
  facebookUrl:
    "https://www.facebook.com/profile.php?id=61586714528777&ref=PROFILE_EDIT_xav_ig_profile_page_web"
};

const defaultProducts = [
  {
    id: "router-wifi-6",
    name: "Routeur Wi-Fi 6 AX23",
    category: "Internet",
    price: "189 DT",
    stock: "En stock",
    description: "Routeur rapide pour maison fibre, streaming et gaming.",
    icon: "router",
    image: ""
  },
  {
    id: "terminal-gpon-ont",
    name: "Terminal fibre GPON ONT",
    category: "Fibre",
    price: "145 DT",
    stock: "Disponible",
    description: "Terminal compact pour installation fibre propre.",
    icon: "cable",
    image: ""
  },
  {
    id: "camera-ip-2k",
    name: "Caméra IP 2K vision nuit",
    category: "CCTV",
    price: "159 DT",
    stock: "Stock limité",
    description: "Surveillance claire avec accès à distance simple.",
    icon: "camera",
    image: ""
  },
  {
    id: "repeteur-mesh",
    name: "Répéteur Mesh AC1200",
    category: "Signal",
    price: "119 DT",
    stock: "En stock",
    description: "Améliore la couverture Wi-Fi dans toute la maison.",
    icon: "wifi",
    image: ""
  },
  {
    id: "casque-pro",
    name: "Casque sans fil Pro",
    category: "Accessoires",
    price: "89 DT",
    stock: "En stock",
    description: "Audio clair pour appels, support et usage quotidien.",
    icon: "headphones",
    image: ""
  },
  {
    id: "pack-installation-fibre",
    name: "Pack installation fibre",
    category: "Service",
    price: "70 DT",
    stock: "Sur demande",
    description: "Placement routeur, câbles propres et contrôle signal.",
    icon: "map",
    image: ""
  },
  {
    id: "chargeur-vert-10dt",
    name: "Chargeur vert compact",
    category: "Accessoires",
    price: "10 DT",
    stock: "En stock",
    description: "Chargeur pratique pour téléphone et accessoires du quotidien.",
    icon: "charger",
    image: ""
  },
  {
    id: "chargeur-orange-20dt",
    name: "Chargeur orange rapide",
    category: "Accessoires",
    price: "20 DT",
    stock: "En stock",
    description: "Chargeur finition orange, solide et adapté à un usage régulier.",
    icon: "charger",
    image: ""
  },
  {
    id: "repeteur-wifi-70dt",
    name: "Répéteur Wi-Fi",
    category: "Signal",
    price: "70 DT",
    stock: "En stock",
    description: "Répéteur Wi-Fi pour améliorer la couverture internet à la maison.",
    icon: "wifi",
    image: ""
  }
];

const legacyDefaultProductIds = new Set([
  "router-wifi-6",
  "terminal-gpon-ont",
  "camera-ip-2k",
  "repeteur-mesh",
  "casque-pro",
  "pack-installation-fibre"
]);

const fallbackProducts = defaultProducts.filter(
  (product) => !legacyDefaultProductIds.has(product.id)
);

const providers = ["Topnet", "GlobalNet", "Tunisie Telecom"];

const productIcons = {
  router: Router,
  cable: Cable,
  camera: Camera,
  charger: Zap,
  wifi: Wifi,
  headphones: Headphones,
  map: MapPinned
};

const serviceCards = [
  {
    title: "Création ligne internet",
    text: "Dossier rapide pour Topnet, GlobalNet et autres fournisseurs.",
    icon: Cable
  },
  {
    title: "Réclamations fournisseur",
    text: "Suivi des problèmes de connexion, lenteur, installation ou facture.",
    icon: CircleAlert
  },
  {
    title: "CCTV & sécurité",
    text: "Caméras IP, installation, conseils et matériel adapté.",
    icon: Camera
  },
  {
    title: "Produits réseau",
    text: "Routeurs, ONT, répéteurs, accessoires et packs fibre.",
    icon: Router
  }
];

const trustItems = [
  { label: "Service rapide", icon: Zap },
  { label: "Support Topnet / GlobalNet", icon: ShieldCheck },
  { label: "WhatsApp direct", icon: MessageCircle }
];

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const error = new Error(data.message || "Une erreur est survenue.");
    error.status = response.status;
    throw error;
  }

  return data;
}

function normalizePhone(number) {
  return String(number || "").replace(/[^\d]/g, "");
}

function App() {
  const reduceMotion = useReducedMotion();
  const [route, setRoute] = useState(getRoute);
  const [settings, setSettings] = useState(defaultSettings);
  const [products, setProducts] = useState(fallbackProducts);
  const [requestCount, setRequestCount] = useState(0);
  const [isPublicLoading, setIsPublicLoading] = useState(true);
  const [publicError, setPublicError] = useState("");

  const loadPublic = useCallback(async () => {
    setIsPublicLoading(true);
    setPublicError("");
    try {
      const data = await apiRequest("/api/public");
      setSettings(data.settings || defaultSettings);
      setProducts(data.products || []);
      setRequestCount(data.requestCount || 0);
    } catch (error) {
      setPublicError(error.message);
    } finally {
      setIsPublicLoading(false);
    }
  }, []);

  const syncPublic = useCallback((data) => {
    if (data.settings) setSettings(data.settings);
    if (data.products) setProducts(data.products);
    if (typeof data.requestCount === "number") setRequestCount(data.requestCount);
  }, []);

  useEffect(() => {
    const onRouteChange = () => setRoute(getRoute());
    window.addEventListener("hashchange", onRouteChange);
    window.addEventListener("popstate", onRouteChange);
    return () => {
      window.removeEventListener("hashchange", onRouteChange);
      window.removeEventListener("popstate", onRouteChange);
    };
  }, []);

  useEffect(() => {
    if (route === "home") {
      loadPublic();
    }
  }, [loadPublic, route]);

  if (route === "admin") {
    return <AdminPage publicSettings={settings} onPublicSync={syncPublic} />;
  }

  return (
    <HomePage
      settings={settings}
      products={products}
      requestCount={requestCount}
      setRequestCount={setRequestCount}
      isProductsLoading={isPublicLoading}
      productsError={publicError}
      reloadProducts={loadPublic}
      reduceMotion={reduceMotion}
    />
  );
}

function getRoute() {
  const hash = window.location.hash.replace("#", "");
  if (hash === ADMIN_ROUTE || window.location.pathname.includes(`/${ADMIN_ROUTE}`)) {
    return "admin";
  }
  return "home";
}

function HomePage({
  settings,
  products,
  requestCount,
  setRequestCount,
  isProductsLoading,
  productsError,
  reloadProducts,
  reduceMotion
}) {
  const [activeTab, setActiveTab] = useState("create");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [lastWhatsappLink, setLastWhatsappLink] = useState("");
  const whatsappNumber = normalizePhone(settings.whatsappNumber);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    const type = activeTab === "create" ? "Création ligne" : "Réclamation";

    setIsSubmitting(true);
    setToast(null);
    setLastWhatsappLink("");

    try {
      const data = await apiRequest("/api/requests", {
        method: "POST",
        body: JSON.stringify({ type, data: payload })
      });
      setRequestCount((count) => count + 1);
      setLastWhatsappLink(data.whatsappLink);
      setToast({
        type: "success",
        message:
          activeTab === "create"
            ? "Demande enregistrée. Vous pouvez aussi l'envoyer sur WhatsApp."
            : "Réclamation enregistrée. Vous pouvez aussi l'envoyer sur WhatsApp."
      });
      form.reset();
    } catch (error) {
      setToast({ type: "error", message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="site-shell">
      <Header settings={settings} />

      <main>
        <section className="hero" id="top">
          <DecorativeNetwork />
          <div className="hero-inner">
            <motion.div
              className="hero-copy"
              initial={reduceMotion ? false : { opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="eyebrow">
                <SparkGlyph />
                {settings.tagline}
              </span>
              <h1>Fibre, CCTV et réseau pour clients exigeants</h1>
              <p>
                {settings.brandName} vous aide à créer une ligne internet, suivre une
                réclamation fournisseur et commander le bon matériel tech en Tunisie.
              </p>

              <div className="hero-actions">
                <a
                  className="primary-action"
                  href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                    `Bonjour ${settings.brandName}, je veux commander un produit ou demander un service.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle size={20} />
                  WhatsApp {settings.whatsappDisplay}
                </a>
                <a className="secondary-action" href="#request">
                  <Send size={20} />
                  Envoyer une demande
                </a>
              </div>

              <div className="trust-row">
                {trustItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <span className="trust-chip" key={item.label}>
                      <Icon size={17} />
                      {item.label}
                    </span>
                  );
                })}
              </div>
            </motion.div>

            <RequestPanel
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              isSubmitting={isSubmitting}
              toast={toast}
              lastWhatsappLink={lastWhatsappLink}
              handleSubmit={handleSubmit}
              settings={settings}
              reduceMotion={reduceMotion}
            />
          </div>
        </section>

        <section className="services-section" aria-labelledby="services-title">
          <div className="section-heading">
            <span className="section-kicker">Services</span>
            <h2 id="services-title">Un seul contact pour internet, réseau et CCTV</h2>
          </div>
          <div className="service-grid">
            {serviceCards.map((service, index) => {
              const Icon = service.icon;
              return (
                <motion.article
                  className="service-card"
                  key={service.title}
                  initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.45, delay: index * 0.05 }}
                >
                  <span>
                    <Icon size={24} />
                  </span>
                  <h3>{service.title}</h3>
                  <p>{service.text}</p>
                </motion.article>
              );
            })}
          </div>
        </section>

        <section className="products-section" id="products" aria-labelledby="products-title">
          <div className="section-heading products-heading">
            <div>
              <span className="section-kicker">Boutique</span>
              <h2 id="products-title">Produits sélectionnés pour une installation propre</h2>
              <p>
                Matériel réseau, fibre, CCTV et accessoires disponibles avec commande
                directe sur WhatsApp.
              </p>
            </div>
            <a
              className="outline-action"
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                `Bonjour ${settings.brandName}, je veux connaître les produits disponibles.`
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              Voir disponibilité
              <ArrowRight size={18} />
            </a>
          </div>

          <ProductsSurface
            products={products}
            settings={settings}
            isLoading={isProductsLoading}
            error={productsError}
            onRetry={reloadProducts}
          />
        </section>
      </main>

      <Footer settings={settings} requestCount={requestCount} />
    </div>
  );
}

function Header({ settings }) {
  const whatsappNumber = normalizePhone(settings.whatsappNumber);

  return (
    <header className="topbar">
      <a className="brand-lockup" href="#top" aria-label={`Accueil ${settings.brandName}`}>
        <span className="brand-mark">
          <img src="/fibereye-logo.png" alt="" />
        </span>
        <span>
          <strong>{settings.brandName}</strong>
          <small>{settings.tagline}</small>
        </span>
      </a>

      <nav className="nav-links" aria-label="Navigation principale">
        <a href="#request">Demandes</a>
        <a href="#products">Produits</a>
        <a href={settings.instagramUrl} target="_blank" rel="noreferrer">
          <SocialIcon type="instagram" />
          Instagram
        </a>
        <a href={settings.facebookUrl} target="_blank" rel="noreferrer">
          <SocialIcon type="facebook" />
          Facebook
        </a>
      </nav>

      <a
        className="header-whatsapp"
        href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
          `Bonjour ${settings.brandName}, j'ai besoin d'aide.`
        )}`}
        target="_blank"
        rel="noreferrer"
      >
        <MessageCircle size={18} />
        WhatsApp
      </a>
    </header>
  );
}

function DecorativeNetwork() {
  return (
    <div className="hero-decoration" aria-hidden="true">
      <span className="network-line line-a" />
      <span className="network-line line-b" />
      <span className="network-line line-c" />
      <span className="network-dot dot-a" />
      <span className="network-dot dot-b" />
      <span className="network-dot dot-c" />
      <span className="signal-ring" />
    </div>
  );
}

function RequestPanel({
  activeTab,
  setActiveTab,
  isSubmitting,
  toast,
  lastWhatsappLink,
  handleSubmit,
  settings,
  reduceMotion
}) {
  const isCreate = activeTab === "create";
  const whatsappNumber = normalizePhone(settings.whatsappNumber);

  return (
    <motion.aside
      className="request-panel"
      id="request"
      aria-label="Panneau de demande"
      initial={reduceMotion ? false : { opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.12 }}
    >
      <div className="panel-top">
        <span className="panel-icon">
          <Send size={24} />
        </span>
        <div>
          <span>Centre de demande</span>
          <h2>Action rapide client</h2>
        </div>
      </div>

      <div className="tab-switcher" role="tablist" aria-label="Type de demande">
        <button
          className={isCreate ? "active" : ""}
          type="button"
          role="tab"
          aria-selected={isCreate}
          onClick={() => setActiveTab("create")}
        >
          <Cable size={18} />
          Créer ligne
        </button>
        <button
          className={!isCreate ? "active" : ""}
          type="button"
          role="tab"
          aria-selected={!isCreate}
          onClick={() => setActiveTab("reclamation")}
        >
          <CircleAlert size={18} />
          Réclamation
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <AnimatePresence mode="wait">
          <motion.div
            className="form-fields"
            key={activeTab}
            initial={reduceMotion ? false : { opacity: 0, x: isCreate ? -14 : 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: isCreate ? 14 : -14 }}
            transition={{ duration: 0.22 }}
          >
            <label>
              Nom complet
              <input name="name" type="text" placeholder="Votre nom" required />
            </label>
            <label>
              Téléphone WhatsApp
              <input name="phone" type="tel" placeholder={settings.whatsappDisplay} required />
            </label>

            {isCreate ? (
              <>
                <label>
                  Adresse ou zone
                  <input name="zone" type="text" placeholder="Ville, quartier, rue" required />
                </label>
                <label>
                  Fournisseur souhaité
                  <select name="provider" defaultValue="Topnet">
                    {providers.map((provider) => (
                      <option key={provider}>{provider}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Besoin
                  <textarea
                    name="need"
                    rows="3"
                    placeholder="Nouvelle ligne fibre, ADSL, upgrade ou installation routeur"
                  />
                </label>
              </>
            ) : (
              <>
                <label>
                  Fournisseur
                  <select name="provider" defaultValue="Topnet">
                    {providers.map((provider) => (
                      <option key={provider}>{provider}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Type de problème
                  <select name="issue" defaultValue="Internet coupé">
                    <option>Internet coupé</option>
                    <option>Connexion lente</option>
                    <option>Paiement ou facture</option>
                    <option>Retard d'installation</option>
                  </select>
                </label>
                <label>
                  Message
                  <textarea
                    name="message"
                    rows="3"
                    placeholder="Expliquez brièvement le problème"
                    required
                  />
                </label>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <button className="submit-request" type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="spin" size={19} />
              Envoi en cours
            </>
          ) : (
            <>
              <Send size={19} />
              {isCreate ? "Envoyer demande" : "Envoyer réclamation"}
            </>
          )}
        </button>
      </form>

      <div className="panel-contact">
        <a
          href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
            `Bonjour ${settings.brandName}, j'ai besoin d'un support rapide.`
          )}`}
          target="_blank"
          rel="noreferrer"
        >
          <MessageCircle size={18} />
          {settings.whatsappDisplay}
        </a>
        <a href={settings.instagramUrl} target="_blank" rel="noreferrer">
          <SocialIcon type="instagram" />
          Instagram
        </a>
        <a href={settings.facebookUrl} target="_blank" rel="noreferrer">
          <SocialIcon type="facebook" />
          Facebook
        </a>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            className={`toast ${toast.type === "error" ? "error" : ""}`}
            role="status"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
          >
            {toast.type === "error" ? <CircleAlert size={18} /> : <CheckCircle2 size={18} />}
            <span>{toast.message}</span>
            {lastWhatsappLink && toast.type !== "error" && (
              <a href={lastWhatsappLink} target="_blank" rel="noreferrer">
                Ouvrir WhatsApp
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}

function ProductsSurface({ products, settings, isLoading, error, onRetry }) {
  if (isLoading) {
    return (
      <div className="state-card loading-state">
        <Loader2 className="spin" size={30} />
        <h3>Chargement produits</h3>
        <p>La boutique {settings.brandName} se prépare.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="state-card error-state">
        <CircleAlert size={30} />
        <h3>Produits indisponibles</h3>
        <p>{error}</p>
        <button className="state-action" type="button" onClick={onRetry}>
          <RefreshCcw size={17} />
          Réessayer
        </button>
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="state-card">
        <PackageCheck size={30} />
        <h3>Aucun produit pour le moment</h3>
        <p>Les nouveaux produits {settings.brandName} apparaîtront bientôt ici.</p>
      </div>
    );
  }

  return (
    <div className="product-grid">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} index={index} settings={settings} />
      ))}
    </div>
  );
}

function ProductCard({ product, index, settings }) {
  const Icon = productIcons[product.icon] || Router;
  const whatsappNumber = normalizePhone(settings.whatsappNumber);
  const details = getProductDetails(product);
  const message = encodeURIComponent(
    `Bonjour ${settings.brandName}, je veux commander : ${product.name}. Merci de me confirmer la disponibilité, les détails et la livraison.`
  );

  return (
    <motion.article
      className={`product-card ${index === 0 ? "featured-product" : ""}`}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.22 }}
      transition={{ duration: 0.45, delay: index * 0.04 }}
    >
      <div className="product-visual-wrap">
        <div className={`product-visual ${product.image ? "has-product-image" : ""}`}>
          {product.image ? <img src={product.image} alt={product.name} /> : <Icon size={46} />}
        </div>
        <span className="product-ref">Réf. {formatProductRef(product, index)}</span>
      </div>
      <div className="product-info">
        <div className="product-meta">
          <span>{product.category}</span>
          <small>
            <CheckCircle2 size={14} />
            {product.stock}
          </small>
        </div>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <div className="product-detail-grid" aria-label={`Détails ${product.name}`}>
          {details.specs.map((detail) => (
            <span key={detail.label}>
              <strong>{detail.value}</strong>
              <small>{detail.label}</small>
            </span>
          ))}
        </div>
        <div className="product-support-line">
          <ShieldCheck size={16} />
          <span>{details.support}</span>
        </div>
      </div>
      <div className="product-footer">
        <div className="price-block">
          <span>Prix</span>
          <strong>{product.price}</strong>
        </div>
        <div className="product-actions">
          <a
            className="product-details-action"
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
              `Bonjour ${settings.brandName}, je veux plus de détails sur : ${product.name}`
            )}`}
            target="_blank"
            rel="noreferrer"
          >
            Détails
          </a>
          <a
            className="product-order-action"
            href={`https://wa.me/${whatsappNumber}?text=${message}`}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={17} />
            Commander
          </a>
        </div>
      </div>
    </motion.article>
  );
}

function getProductDetails(product) {
  const key = `${product.icon || ""} ${product.category || ""} ${product.name || ""}`.toLowerCase();

  if (key.includes("camera") || key.includes("cctv")) {
    return {
      specs: [
        { label: "Image", value: "2K / HD" },
        { label: "Usage", value: "Sécurité" },
        { label: "Accès", value: "Mobile" }
      ],
      support: "Conseil placement caméra, angle de vue et configuration application."
    };
  }

  if (key.includes("gpon") || key.includes("ont") || key.includes("fibre")) {
    return {
      specs: [
        { label: "Réseau", value: "Fibre" },
        { label: "Signal", value: "Stable" },
        { label: "Pose", value: "Propre" }
      ],
      support: "Vérification compatibilité ligne, signal et installation avec câblage propre."
    };
  }

  if (key.includes("mesh") || key.includes("répéteur") || key.includes("repeteur") || key.includes("wifi")) {
    return {
      specs: [
        { label: "Couverture", value: "Maison" },
        { label: "Usage", value: "Wi-Fi" },
        { label: "Setup", value: "Rapide" }
      ],
      support: "Aide au positionnement pour améliorer le signal dans les pièces faibles."
    };
  }

  if (key.includes("chargeur") || key.includes("charger")) {
    return {
      specs: [
        { label: "Type", value: "Chargeur" },
        { label: "Usage", value: "Mobile" },
        { label: "Format", value: "Compact" }
      ],
      support: "Confirmation disponibilité, couleur et compatibilité avant commande."
    };
  }

  if (key.includes("casque") || key.includes("accessoire") || key.includes("headphone")) {
    return {
      specs: [
        { label: "Type", value: "Sans fil" },
        { label: "Usage", value: "Appels" },
        { label: "Confort", value: "Pro" }
      ],
      support: "Confirmation disponibilité, couleur et compatibilité avant commande."
    };
  }

  if (key.includes("service") || key.includes("pack") || key.includes("installation")) {
    return {
      specs: [
        { label: "Service", value: "Sur site" },
        { label: "Contrôle", value: "Signal" },
        { label: "Finition", value: "Propre" }
      ],
      support: "Diagnostic, placement routeur et contrôle signal après installation."
    };
  }

  return {
    specs: [
      { label: "Standard", value: "Wi-Fi 6" },
      { label: "Usage", value: "Fibre" },
      { label: "Profil", value: "Maison" }
    ],
    support: "Conseil avant achat, installation routeur et assistance WhatsApp."
  };
}

function formatProductRef(product, index) {
  const raw = product.id || product.name || `product-${index + 1}`;
  return raw
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 14)
    .toUpperCase();
}

function Footer({ settings, requestCount }) {
  const whatsappNumber = normalizePhone(settings.whatsappNumber);

  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <span className="brand-mark">
          <img src="/fibereye-logo.png" alt="" />
        </span>
        <div>
          <strong>{settings.brandName}</strong>
          <p>{settings.tagline}</p>
        </div>
      </div>
      <div className="footer-links">
        <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer">
          <MessageCircle size={17} />
          {settings.whatsappDisplay}
        </a>
        <a href={settings.instagramUrl} target="_blank" rel="noreferrer">
          <SocialIcon type="instagram" />
          Instagram
        </a>
        <a href={settings.facebookUrl} target="_blank" rel="noreferrer">
          <SocialIcon type="facebook" />
          Facebook
        </a>
        <span className="footer-stat">{requestCount} demandes</span>
      </div>
    </footer>
  );
}

function AdminPage({ publicSettings, onPublicSync }) {
  const [authState, setAuthState] = useState("checking");
  const [settings, setSettings] = useState(publicSettings);
  const [products, setProducts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(emptyStats());
  const [backups, setBackups] = useState([]);
  const [code, setCode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [activePanel, setActivePanel] = useState("requests");
  const [draftSettings, setDraftSettings] = useState({ ...publicSettings, adminCode: "" });
  const [productDraft, setProductDraft] = useState(emptyProduct());
  const [editingId, setEditingId] = useState("");
  const [adminNotice, setAdminNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);

  const loadAdminData = useCallback(async () => {
    setActionError("");
    try {
      const data = await apiRequest("/api/admin/data");
      setSettings(data.settings || defaultSettings);
      setDraftSettings({ ...(data.settings || defaultSettings), adminCode: "" });
      setProducts(data.products || []);
      setRequests(data.requests || []);
      setStats(data.stats || buildClientStats(data.products || [], data.requests || []));
      const backupData = await apiRequest("/api/admin/backups").catch(() => ({ backups: [] }));
      setBackups(backupData.backups || []);
      onPublicSync({
        settings: data.settings,
        products: data.products,
        requestCount: data.requests?.length || 0
      });
      setAuthState("authed");
      return data;
    } catch (error) {
      if (error.status === 401) {
        setAuthState("guest");
      } else {
        setActionError(error.message);
        setAuthState("guest");
      }
      return null;
    }
  }, [onPublicSync]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  async function login(event) {
    event.preventDefault();
    setLoginError("");
    setIsSaving(true);

    try {
      await apiRequest("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ code })
      });
      setCode("");
      await loadAdminData();
    } catch (error) {
      setLoginError(error.message);
      setAuthState("guest");
    } finally {
      setIsSaving(false);
    }
  }

  async function logout() {
    await apiRequest("/api/admin/logout", { method: "POST" }).catch(() => null);
    setAuthState("guest");
    setProducts([]);
    setRequests([]);
    setCode("");
  }

  async function saveSettings(event) {
    event.preventDefault();
    setIsSaving(true);
    setAdminNotice("");
    setActionError("");

    const { adminCode, ...publicDraft } = draftSettings;
    const body = { settings: publicDraft };
    if (adminCode?.trim()) {
      body.adminCode = adminCode.trim();
    }

    try {
      const data = await apiRequest("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify(body)
      });
      setSettings(data.settings);
      setDraftSettings({ ...data.settings, adminCode: "" });
      onPublicSync({ settings: data.settings });
      setAdminNotice(
        adminCode?.trim()
          ? "Paramètres sauvegardés. Le code admin a été changé."
          : "Paramètres sauvegardés."
      );
    } catch (error) {
      handleAdminError(error);
    } finally {
      setIsSaving(false);
    }
  }

  async function submitProduct(event) {
    event.preventDefault();
    setIsSaving(true);
    setAdminNotice("");
    setActionError("");

    try {
      const data = await apiRequest(
        editingId ? `/api/admin/products/${encodeURIComponent(editingId)}` : "/api/admin/products",
        {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify(productDraft)
        }
      );
      setProducts(data.products || []);
      setStats(data.stats || buildClientStats(data.products || [], requests));
      onPublicSync({ products: data.products || [] });
      setEditingId("");
      setProductDraft(emptyProduct());
      setAdminNotice(editingId ? "Produit modifié." : "Produit ajouté.");
    } catch (error) {
      handleAdminError(error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleProductImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImageUploading(true);
    setAdminNotice("");
    setActionError("");

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const data = await apiRequest("/api/admin/images", {
        method: "POST",
        body: JSON.stringify({ dataUrl })
      });
      setProductDraft((current) => ({ ...current, image: data.image }));
      setAdminNotice("Image produit ajoutée.");
    } catch (error) {
      handleAdminError(error);
    } finally {
      setIsImageUploading(false);
      event.target.value = "";
    }
  }

  function editProduct(product) {
    setEditingId(product.id);
    setProductDraft(product);
    setActivePanel("products");
    setAdminNotice("");
    setActionError("");
  }

  async function deleteProduct(productId) {
    if (!window.confirm("Supprimer ce produit ?")) return;

    setIsSaving(true);
    setAdminNotice("");
    setActionError("");
    try {
      const data = await apiRequest(`/api/admin/products/${encodeURIComponent(productId)}`, {
        method: "DELETE"
      });
      setProducts(data.products || []);
      setStats(data.stats || buildClientStats(data.products || [], requests));
      onPublicSync({ products: data.products || [] });
      setAdminNotice("Produit supprimé.");
    } catch (error) {
      handleAdminError(error);
    } finally {
      setIsSaving(false);
    }
  }

  async function updateRequestStatus(requestId, status) {
    setActionError("");
    try {
      const data = await apiRequest(`/api/admin/requests/${encodeURIComponent(requestId)}`, {
        method: "PUT",
        body: JSON.stringify({ status })
      });
      setRequests(data.requests || []);
      setStats(data.stats || buildClientStats(products, data.requests || []));
      onPublicSync({ requestCount: data.requests?.length || 0 });
    } catch (error) {
      handleAdminError(error);
    }
  }

  async function deleteRequest(requestId) {
    if (!window.confirm("Supprimer cette demande ?")) return;

    setActionError("");
    try {
      const data = await apiRequest(`/api/admin/requests/${encodeURIComponent(requestId)}`, {
        method: "DELETE"
      });
      setRequests(data.requests || []);
      setStats(data.stats || buildClientStats(products, data.requests || []));
      onPublicSync({ requestCount: data.requests?.length || 0 });
      setAdminNotice("Demande supprimée.");
    } catch (error) {
      handleAdminError(error);
    }
  }

  async function refreshData() {
    const data = await loadAdminData();
    if (data) setAdminNotice("Données actualisées.");
  }

  async function createBackendBackup() {
    setIsSaving(true);
    setAdminNotice("");
    setActionError("");

    try {
      const data = await apiRequest("/api/admin/backup", { method: "POST" });
      setBackups(data.backups || []);
      setAdminNotice(`Backup créé: ${data.backup?.name || "data/backups"}.`);
    } catch (error) {
      handleAdminError(error);
    } finally {
      setIsSaving(false);
    }
  }

  async function cleanupBackendImages() {
    if (!window.confirm("Nettoyer les images uploadées non utilisées par les produits ?")) return;

    setIsSaving(true);
    setAdminNotice("");
    setActionError("");

    try {
      const data = await apiRequest("/api/admin/maintenance/cleanup-images", { method: "POST" });
      setAdminNotice(`${data.deletedCount || 0} image(s) inutilisée(s) supprimée(s).`);
    } catch (error) {
      handleAdminError(error);
    } finally {
      setIsSaving(false);
    }
  }

  function handleAdminError(error) {
    if (error.status === 401) {
      setAuthState("guest");
      setLoginError("Session expirée. Reconnectez-vous.");
      return;
    }
    setActionError(error.message);
  }

  if (authState === "checking") {
    return (
      <div className="admin-shell login-shell">
        <div className="login-card">
          <span className="brand-mark">
            <img src="/fibereye-logo.png" alt="" />
          </span>
          <h1>Admin {publicSettings.brandName}</h1>
          <p>Vérification de la session sécurisée.</p>
          <div className="admin-loading">
            <Loader2 className="spin" size={20} />
            Chargement
          </div>
        </div>
      </div>
    );
  }

  if (authState !== "authed") {
    return (
      <div className="admin-shell login-shell">
        <form className="login-card" onSubmit={login}>
          <span className="brand-mark">
            <img src="/fibereye-logo.png" alt="" />
          </span>
          <h1>Admin {publicSettings.brandName}</h1>
          <p>Entrez le code admin pour gérer les produits, demandes et contacts.</p>
          <label>
            Code admin
            <input
              type="password"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Code"
              required
            />
          </label>
          <button className="submit-request" type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 className="spin" size={18} /> : <Lock size={18} />}
            Entrer
          </button>
          {(loginError || actionError) && (
            <div className="login-error">{loginError || actionError}</div>
          )}
          <a className="back-link" href="#top">
            Retour au site
          </a>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <a className="brand-lockup" href="#top">
          <span className="brand-mark">
            <img src="/fibereye-logo.png" alt="" />
          </span>
          <span>
            <strong>{settings.brandName}</strong>
            <small>Dashboard admin sécurisé</small>
          </span>
        </a>
        <div className="admin-actions">
          <button type="button" onClick={refreshData}>
            <RefreshCcw size={18} />
            Actualiser
          </button>
          <a href="#top">
            <Eye size={18} />
            Voir site
          </a>
          <button type="button" onClick={logout}>
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </header>

      <main className="admin-layout">
        <aside className="admin-sidebar">
          <button
            className={activePanel === "requests" ? "active" : ""}
            type="button"
            onClick={() => setActivePanel("requests")}
          >
            <Inbox size={18} />
            Demandes
            <span>{requests.length}</span>
          </button>
          <button
            className={activePanel === "products" ? "active" : ""}
            type="button"
            onClick={() => setActivePanel("products")}
          >
            <ShoppingBag size={18} />
            Produits
            <span>{products.length}</span>
          </button>
          <button
            className={activePanel === "settings" ? "active" : ""}
            type="button"
            onClick={() => setActivePanel("settings")}
          >
            <Settings size={18} />
            Paramètres
          </button>
          <button
            className={activePanel === "backend" ? "active" : ""}
            type="button"
            onClick={() => setActivePanel("backend")}
          >
            <Database size={18} />
            Backend
          </button>
        </aside>

        <section className="admin-panel">
          {(adminNotice || actionError) && (
            <div className={`admin-notice ${actionError ? "error" : ""}`}>
              {actionError ? <CircleAlert size={18} /> : <CheckCircle2 size={18} />}
              {actionError || adminNotice}
            </div>
          )}

          {activePanel === "requests" && (
            <>
              <AdminHeading
                title="Demandes clients"
                text="Toutes les créations de ligne et réclamations envoyées depuis le site."
              />
              <AdminStats stats={stats} />
              <div className="request-list">
                {requests.length === 0 ? (
                  <div className="admin-empty">
                    <Inbox size={28} />
                    <h3>Aucune demande pour le moment</h3>
                    <p>Les créations de ligne et réclamations apparaîtront ici.</p>
                  </div>
                ) : (
                  requests.map((request) => (
                    <article className="request-card" key={request.id}>
                      <div>
                        <span className="request-type">{request.type}</span>
                        <h3>{request.data.name || "Client sans nom"}</h3>
                        <p>{formatRequestSummary(request)}</p>
                        <small>{new Date(request.createdAt).toLocaleString("fr-FR")}</small>
                      </div>
                      <div className="request-actions">
                        <select
                          value={request.status}
                          onChange={(event) => updateRequestStatus(request.id, event.target.value)}
                        >
                          <option>Nouveau</option>
                          <option>En cours</option>
                          <option>Terminé</option>
                        </select>
                        <a href={request.whatsappLink} target="_blank" rel="noreferrer">
                          WhatsApp
                        </a>
                        <button type="button" onClick={() => deleteRequest(request.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </>
          )}

          {activePanel === "products" && (
            <>
              <AdminHeading
                title="Gestion produits"
                text="Ajoutez, modifiez ou supprimez les produits affichés dans la boutique."
              />
              <form className="admin-form product-editor" onSubmit={submitProduct}>
                <label>
                  Nom produit
                  <input
                    value={productDraft.name}
                    onChange={(event) =>
                      setProductDraft({ ...productDraft, name: event.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  Catégorie
                  <input
                    value={productDraft.category}
                    onChange={(event) =>
                      setProductDraft({ ...productDraft, category: event.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  Prix
                  <input
                    value={productDraft.price}
                    onChange={(event) =>
                      setProductDraft({ ...productDraft, price: event.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  Stock
                  <input
                    value={productDraft.stock}
                    onChange={(event) =>
                      setProductDraft({ ...productDraft, stock: event.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  Icône
                  <select
                    value={productDraft.icon}
                    onChange={(event) =>
                      setProductDraft({ ...productDraft, icon: event.target.value })
                    }
                  >
                    <option value="router">Routeur</option>
                    <option value="cable">Fibre</option>
                    <option value="camera">Caméra</option>
                    <option value="charger">Chargeur</option>
                    <option value="wifi">Wi-Fi</option>
                    <option value="headphones">Accessoire</option>
                    <option value="map">Service</option>
                  </select>
                </label>
                <label>
                  Image produit
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleProductImage} />
                  <small className="upload-note">
                    {isImageUploading
                      ? "Upload en cours..."
                      : productDraft.image
                        ? "Image prête pour ce produit."
                        : "PNG, JPG, WEBP ou GIF."}
                  </small>
                </label>
                <label className="wide-field">
                  Description
                  <textarea
                    value={productDraft.description}
                    onChange={(event) =>
                      setProductDraft({ ...productDraft, description: event.target.value })
                    }
                    required
                  />
                </label>
                {productDraft.image && (
                  <div className="wide-field product-image-preview">
                    <img src={productDraft.image} alt="" />
                    <button
                      className="danger-action"
                      type="button"
                      onClick={() => setProductDraft({ ...productDraft, image: "" })}
                    >
                      Supprimer image
                    </button>
                  </div>
                )}
                <button className="submit-request" type="submit" disabled={isSaving || isImageUploading}>
                  {isSaving ? (
                    <Loader2 className="spin" size={18} />
                  ) : editingId ? (
                    <Save size={18} />
                  ) : (
                    <Plus size={18} />
                  )}
                  {editingId ? "Sauvegarder produit" : "Ajouter produit"}
                </button>
                {editingId && (
                  <button
                    className="danger-action"
                    type="button"
                    onClick={() => {
                      setEditingId("");
                      setProductDraft(emptyProduct());
                    }}
                  >
                    Annuler modification
                  </button>
                )}
              </form>

              <div className="admin-product-list">
                {products.length === 0 ? (
                  <div className="admin-empty">
                    <ShoppingBag size={28} />
                    <h3>Aucun produit</h3>
                    <p>Ajoutez vos routeurs, caméras, packs fibre et accessoires ici.</p>
                  </div>
                ) : (
                  products.map((product) => (
                    <article className="admin-product" key={product.id}>
                      <ProductThumb product={product} />
                      <div>
                        <strong>{product.name}</strong>
                        <p>
                          {product.category} · {product.price} · {product.stock}
                        </p>
                      </div>
                      <div>
                        <button type="button" onClick={() => editProduct(product)}>
                          <Edit3 size={16} />
                        </button>
                        <button type="button" onClick={() => deleteProduct(product.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </>
          )}

          {activePanel === "settings" && (
            <>
              <AdminHeading
                title="Paramètres site"
                text="Modifiez les contacts, réseaux sociaux et informations de marque."
              />
              <form className="admin-form settings-form" onSubmit={saveSettings}>
                <label>
                  Nom de marque
                  <input
                    value={draftSettings.brandName}
                    onChange={(event) =>
                      setDraftSettings({ ...draftSettings, brandName: event.target.value })
                    }
                  />
                </label>
                <label>
                  Slogan
                  <input
                    value={draftSettings.tagline}
                    onChange={(event) =>
                      setDraftSettings({ ...draftSettings, tagline: event.target.value })
                    }
                  />
                </label>
                <label>
                  Numéro WhatsApp
                  <input
                    value={draftSettings.whatsappNumber}
                    onChange={(event) =>
                      setDraftSettings({ ...draftSettings, whatsappNumber: event.target.value })
                    }
                  />
                </label>
                <label>
                  Affichage WhatsApp
                  <input
                    value={draftSettings.whatsappDisplay}
                    onChange={(event) =>
                      setDraftSettings({ ...draftSettings, whatsappDisplay: event.target.value })
                    }
                  />
                </label>
                <label className="wide-field">
                  Instagram
                  <input
                    value={draftSettings.instagramUrl}
                    onChange={(event) =>
                      setDraftSettings({ ...draftSettings, instagramUrl: event.target.value })
                    }
                  />
                </label>
                <label className="wide-field">
                  Facebook
                  <input
                    value={draftSettings.facebookUrl}
                    onChange={(event) =>
                      setDraftSettings({ ...draftSettings, facebookUrl: event.target.value })
                    }
                  />
                </label>
                <label className="wide-field">
                  Nouveau code admin
                  <input
                    type="password"
                    value={draftSettings.adminCode || ""}
                    onChange={(event) =>
                      setDraftSettings({ ...draftSettings, adminCode: event.target.value })
                    }
                    placeholder="Laissez vide pour garder le code actuel"
                  />
                </label>
                <button className="submit-request" type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
                  Sauvegarder paramètres
                </button>
              </form>
            </>
          )}

          {activePanel === "backend" && (
            <>
              <AdminHeading
                title="Backend & données"
                text="Export, sauvegarde et maintenance des données du site."
              />
              <AdminStats stats={stats} />
              <div className="backend-tool-grid">
                <article className="backend-tool">
                  <span>
                    <Download size={22} />
                  </span>
                  <div>
                    <h3>Exporter les demandes</h3>
                    <p>Téléchargez un fichier CSV pour suivi client ou archive.</p>
                  </div>
                  <a href="/api/admin/export/requests" download>
                    Export CSV
                  </a>
                </article>

                <article className="backend-tool">
                  <span>
                    <HardDrive size={22} />
                  </span>
                  <div>
                    <h3>Créer un backup</h3>
                    <p>Copie `db.json` et les images produits dans `data/backups`.</p>
                  </div>
                  <button type="button" onClick={createBackendBackup} disabled={isSaving}>
                    Backup
                  </button>
                </article>

                <article className="backend-tool">
                  <span>
                    <Wrench size={22} />
                  </span>
                  <div>
                    <h3>Nettoyer les images</h3>
                    <p>Supprime les uploads qui ne sont plus utilisés par un produit.</p>
                  </div>
                  <button type="button" onClick={cleanupBackendImages} disabled={isSaving}>
                    Nettoyer
                  </button>
                </article>
              </div>

              <div className="backup-list">
                <h3>Backups récents</h3>
                {backups.length === 0 ? (
                  <p>Aucun backup pour le moment.</p>
                ) : (
                  backups.slice(0, 6).map((backup) => (
                    <div key={backup.name}>
                      <span>{backup.name}</span>
                      <small>
                        {backup.createdAt
                          ? new Date(backup.createdAt).toLocaleString("fr-FR")
                          : "Date inconnue"}
                      </small>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function AdminHeading({ title, text }) {
  return (
    <div className="admin-heading">
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  );
}

function AdminStats({ stats }) {
  const cards = [
    { label: "Demandes", value: stats.requests, hint: `${stats.newRequests} nouvelles` },
    { label: "En cours", value: stats.inProgressRequests, hint: "Suivi client" },
    { label: "Produits", value: stats.products, hint: `${stats.productsWithImages} avec image` },
    {
      label: "Dernière demande",
      value: stats.latestRequestAt ? new Date(stats.latestRequestAt).toLocaleDateString("fr-FR") : "-",
      hint: stats.latestRequestAt ? new Date(stats.latestRequestAt).toLocaleTimeString("fr-FR") : "Aucune"
    }
  ];

  return (
    <div className="admin-stats-grid">
      {cards.map((card) => (
        <article className="admin-stat-card" key={card.label}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
          <small>{card.hint}</small>
        </article>
      ))}
    </div>
  );
}

function emptyStats() {
  return {
    products: 0,
    productsWithImages: 0,
    requests: 0,
    newRequests: 0,
    inProgressRequests: 0,
    doneRequests: 0,
    latestRequestAt: null
  };
}

function buildClientStats(products, requests) {
  const statusCounts = requests.reduce(
    (counts, request) => {
      counts[request.status] = (counts[request.status] || 0) + 1;
      return counts;
    },
    { Nouveau: 0, "En cours": 0, Terminé: 0 }
  );
  const latestRequestAt =
    requests
      .map((request) => request.createdAt)
      .filter(Boolean)
      .sort()
      .at(-1) || null;

  return {
    products: products.length,
    productsWithImages: products.filter((product) => product.image).length,
    requests: requests.length,
    newRequests: statusCounts.Nouveau || 0,
    inProgressRequests: statusCounts["En cours"] || 0,
    doneRequests: statusCounts.Terminé || 0,
    latestRequestAt
  };
}

function emptyProduct() {
  return {
    id: "",
    name: "",
    category: "",
    price: "",
    stock: "En stock",
    description: "",
    icon: "router",
    image: ""
  };
}

function ProductThumb({ product }) {
  const Icon = productIcons[product.icon] || Router;

  return (
    <span className="admin-product-thumb">
      {product.image ? <img src={product.image} alt="" /> : <Icon size={22} />}
    </span>
  );
}

function formatRequestSummary(request) {
  const { data } = request;
  return [data.phone, data.provider, data.zone, data.issue, data.need || data.message]
    .filter(Boolean)
    .join(" · ");
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Impossible de lire l'image."));
    reader.readAsDataURL(file);
  });
}

function SparkGlyph() {
  return (
    <span className="spark-glyph" aria-hidden="true">
      <ShoppingBag size={16} />
    </span>
  );
}

function SocialIcon({ type }) {
  if (type === "facebook") {
    return (
      <span className="social-icon facebook-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" role="img">
          <path d="M14.2 8.1V6.7c0-.7.5-1.1 1.2-1.1h1.5V3.1c-.7-.1-1.5-.2-2.3-.2-2.4 0-4 1.5-4 4v1.2H8.1v2.8h2.5V21h3.1V10.9h2.6l.4-2.8h-2.5Z" />
        </svg>
      </span>
    );
  }

  return (
    <span className="social-icon instagram-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" role="img">
        <rect x="4.2" y="4.2" width="15.6" height="15.6" rx="4.4" />
        <circle cx="12" cy="12" r="3.7" />
        <circle cx="16.9" cy="7.1" r="1.1" />
      </svg>
    </span>
  );
}

export default App;
