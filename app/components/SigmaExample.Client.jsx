import React, {useEffect, useRef, useState} from "react";

const GRAPH_CDN_URL = "https://esm.sh/graphology@0.25.4?bundle";
const SIGMA_CDN_URL = "https://esm.sh/sigma@3.0.0?bundle";
const COLLECTION_URL =
  "https://raw.githubusercontent.com/gracegormley-gkg/canumpy-/refs/heads/main/collection-eis-v4.json";

const CANOPY_BASE_URL = "https://nulib-ds.github.io/EIS-Final";

// Canopy truncates slugs to 50 chars and appends .html
function manifestToCanopyUrl(manifestId) {
  const filename = manifestId
    .split("/")
    .pop()
    .replace(/\.json$/, "");
  const slug = filename.slice(0, 50);
  return `${CANOPY_BASE_URL}/works/${slug}.html`;
}

const themeColors = {
  theme1: "#3b82f6",
  theme2: "#16a34a",
  theme3: "#f59e0b",
  theme4: "#94a3b8",
  theme5: "#f97316",
  theme6: "#7dd3fc",
  theme7: "#78716c",
  theme8: "#b45309",
  theme9: "#1d4ed8",
  theme10: "#a21caf",
};

// Lighten a hex color by mixing it toward white (factor 0–1)
function lightenColor(hex, factor = 0.45) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * factor);
  const lg = Math.round(g + (255 - g) * factor);
  const lb = Math.round(b + (255 - b) * factor);
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}

// Return the lightened color for a subtheme. For multi-parent subthemes the
// dominant parent (most docs) is determined at load time; until then we use
// the first parent as a placeholder.
function subthemeColor(sub, dominantParentId) {
  const pid = dominantParentId ?? sub.parentThemes[0];
  return lightenColor(themeColors[pid]);
}

// All unique subthemes with the main theme IDs they belong to
// parentThemes[0] is the PRIMARY parent — it controls which theme node this
// subtheme orbits and its color. The rest are secondary relationships.
// Distribution: theme1→1, theme2→2, theme3→2, theme4→2, theme5→2,
//               theme6→1, theme7→2, theme8→2, theme9→1, theme10→2
const subthemes = [
  {
    id: "sub_climate_eng",
    label: "Climate Engineering and Intervention",
    parentThemes: ["theme6", "theme1"],          // Climate & Weather primary
  },
  {
    id: "sub_community_res",
    label: "Community Resistance and Activism",
    parentThemes: ["theme8", "theme3", "theme4", "theme5"], // Place-Based Conflicts primary
  },
  {
    id: "sub_energy_dist",
    label: "Energy Distribution and Consumption",
    parentThemes: ["theme3", "theme4", "theme5"],           // Energy Systems primary
  },
  {
    id: "sub_energy_ext",
    label: "Energy Extraction and Production",
    parentThemes: ["theme3", "theme1", "theme2", "theme5", "theme8"], // Energy Systems primary
  },
  {
    id: "sub_env_reg",
    label: "Environmental Regulation and Policy",
    parentThemes: ["theme9", "theme2"],          // Governance primary
  },
  {
    id: "sub_habitat",
    label: "Habitat Conservation and Biodiversity",
    parentThemes: ["theme2", "theme1", "theme4", "theme5", "theme9"], // Wildlife primary
  },
  {
    id: "sub_housing",
    label: "Housing, Planning, and Built Environment",
    parentThemes: ["theme5", "theme3"],          // Urban Development primary
  },
  {
    id: "sub_human_wildlife",
    label: "Human–Wildlife Interactions",
    parentThemes: ["theme2"],                    // Wildlife (only parent)
  },
  {
    id: "sub_indigenous",
    label: "Indigenous Knowledge and Environmental Stewardship",
    parentThemes: ["theme10", "theme5"],         // Indigenous Narratives primary
  },
  {
    id: "sub_industrial",
    label: "Industrial Manufacturing and Pollution",
    parentThemes: ["theme7", "theme3"],          // Industrial Production primary
  },
  {
    id: "sub_infra",
    label: "Infrastructure Impacts on Landscapes",
    parentThemes: ["theme4", "theme1", "theme2", "theme3"], // Transportation primary
  },
  {
    id: "sub_land_rights",
    label: "Land Rights and Displacement",
    parentThemes: ["theme8", "theme4", "theme5"], // Place-Based Conflicts primary
  },
  {
    id: "sub_mobility",
    label: "Mobility Networks and Connectivity",
    parentThemes: ["theme4", "theme1", "theme2", "theme3", "theme5", "theme8"], // Transportation primary
  },
  {
    id: "sub_resource",
    label: "Resource Extraction and Material Flows",
    parentThemes: ["theme7"],                    // Industrial (only parent)
  },
  {
    id: "sub_sovereignty",
    label: "Sovereignty, Rights, and Self-Determination",
    parentThemes: ["theme10"],                   // Indigenous (only parent)
  },
  {
    id: "sub_urban_exp",
    label: "Urban Expansion and Land Use Change",
    parentThemes: ["theme5", "theme1", "theme2", "theme3", "theme4", "theme10"], // Urban Development primary
  },
  {
    id: "sub_water_infra",
    label: "Water Infrastructure and Management",
    parentThemes: ["theme1", "theme2", "theme3", "theme4", "theme5", "theme6"], // Water Systems primary
  },
];

const themes = [
  {id: "theme1", label: "Water Systems"},
  {id: "theme2", label: "Wildlife and Natural Areas"},
  {id: "theme3", label: "Energy Systems"},
  {id: "theme4", label: "Transportation Infrastructure"},
  {id: "theme5", label: "Urban Development"},
  {id: "theme6", label: "Climate and Weather Modification"},
  {id: "theme7", label: "Industrial Production and Materials"},
  {id: "theme8", label: "Place Based Development Conflicts"},
  {id: "theme9", label: "Governance and Institutional Control"},
  {id: "theme10", label: "Indigenous Narratives and Sovereignty"},
];

const fixedPositions = {
  theme1: {x: -0.6, y: 0.4},
  theme2: {x: -0.5, y: -0.1},
  theme6: {x: -0.2, y: 0.4},
  theme3: {x: 0.0, y: 0.1},
  theme4: {x: 0.3, y: 0.3},
  theme7: {x: 0.3, y: -0.1},
  theme5: {x: 0.6, y: 0.2},
  theme9: {x: 0.6, y: -0.2},
  theme8: {x: 0.2, y: -0.4},
  theme10: {x: -0.3, y: -0.5},
};

if (typeof document !== "undefined" && !document.getElementById("sigma-font")) {
  const link = document.createElement("link");
  link.id = "sigma-font";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Serif+Display&display=swap";
  document.head.appendChild(link);
}

// Extract all values for a metadata field from a v4 collection item
function getItemMetaValues(item, labelName) {
  if (!item.metadata) return [];
  const entry = item.metadata.find(
    (m) => m.label?.none?.[0]?.toLowerCase() === labelName.toLowerCase(),
  );
  return entry?.value?.none ?? [];
}

// ─── Document Panel ──────────────────────────────────────────────────────────

function DocPanel({selectedNode, docs, onClose}) {
  const isSubtheme = selectedNode?.nodeType === "subtheme";

  // Derive panel accent color
  let color;
  if (isSubtheme) {
    color =
      selectedNode.parentThemes.length === 1
        ? themeColors[selectedNode.parentThemes[0]]
        : "#6642a4";
  } else {
    color = themeColors[selectedNode?.id] ?? "#94a3b8";
  }

  const filtered = isSubtheme
    ? docs.filter((d) =>
        d.subthemes.some(
          (s) => s.toLowerCase() === selectedNode.label.toLowerCase(),
        ),
      )
    : docs.filter((d) =>
        d.themes.some(
          (t) => t.toLowerCase() === selectedNode?.label?.toLowerCase(),
        ),
      );

  // For subtheme panel: show which parent themes it belongs to
  const parentThemeLabels = isSubtheme
    ? selectedNode.parentThemes.map(
        (tid) => themes.find((t) => t.id === tid)?.label,
      ).filter(Boolean)
    : [];

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: "360px",
        height: "100%",
        background: "#fff",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
        display: "flex",
        flexDirection: "column",
        zIndex: 10,
        fontFamily: "'DM Sans', sans-serif",
        overflowY: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 20px 16px",
          borderBottom: `3px solid ${color}`,
          background: "#fafafa",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: color,
                marginBottom: "4px",
              }}
            >
              {isSubtheme ? "Subtheme" : "Theme"}
            </div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#0f172a",
                lineHeight: 1.3,
              }}
            >
              {selectedNode?.label}
            </div>
            {isSubtheme && parentThemeLabels.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "4px",
                  marginTop: "6px",
                }}
              >
                {parentThemeLabels.map((lbl, i) => {
                  const tid = selectedNode.parentThemes[i];
                  return (
                    <span
                      key={tid}
                      style={{
                        fontSize: "10px",
                        background: themeColors[tid] + "22",
                        color: themeColors[tid],
                        border: `1px solid ${themeColors[tid]}44`,
                        borderRadius: "4px",
                        padding: "1px 6px",
                        fontWeight: 500,
                      }}
                    >
                      {lbl}
                    </span>
                  );
                })}
              </div>
            )}
            <div style={{fontSize: "13px", color: "#64748b", marginTop: "6px"}}>
              {filtered.length} document{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              fontSize: "20px",
              lineHeight: 1,
              padding: "2px 4px",
              borderRadius: "4px",
              flexShrink: 0,
            }}
            aria-label="Close panel"
          >
            ×
          </button>
        </div>
      </div>

      {/* Document list */}
      <div style={{overflowY: "auto", flex: 1, padding: "12px"}}>
        {filtered.length === 0 ? (
          <div
            style={{
              color: "#94a3b8",
              fontSize: "14px",
              padding: "24px 8px",
              textAlign: "center",
            }}
          >
            No documents found for this {isSubtheme ? "subtheme" : "theme"}.
          </div>
        ) : (
          filtered.map((doc) => (
            <a
              key={doc.id}
              href={manifestToCanopyUrl(doc.id)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                gap: "12px",
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "8px",
                textDecoration: "none",
                color: "inherit",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                transition: "box-shadow 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f1f5f9";
                e.currentTarget.style.boxShadow = `0 0 0 2px ${color}40`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#f8fafc";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {doc.thumbnail && (
                <img
                  src={doc.thumbnail}
                  alt=""
                  style={{
                    width: "52px",
                    height: "68px",
                    objectFit: "cover",
                    borderRadius: "4px",
                    flexShrink: 0,
                    border: "1px solid #e2e8f0",
                  }}
                />
              )}
              <div style={{minWidth: 0}}>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#0f172a",
                    lineHeight: 1.4,
                    marginBottom: "6px",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {doc.label}
                </div>
                {doc.summary && (
                  <div
                    style={{
                      fontSize: "11.5px",
                      color: "#64748b",
                      lineHeight: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {doc.summary}
                  </div>
                )}
                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "11px",
                    color: color,
                    fontWeight: 500,
                  }}
                >
                  Open on site →
                </div>
              </div>
            </a>
          ))
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "10px 16px",
          borderTop: "1px solid #e2e8f0",
          fontSize: "11px",
          color: "#94a3b8",
          flexShrink: 0,
          background: "#fafafa",
        }}
      >
        Northwestern University Libraries · Environmental Impact Statement
        Collection
      </div>
    </div>
  );
}

// ─── Loading overlay ──────────────────────────────────────────────────────────

function LoadingOverlay() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(255,255,255,0.92)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 20,
        fontFamily: "'DM Sans', sans-serif",
        gap: "16px",
      }}
    >
      <div style={{fontSize: "14px", color: "#475569", fontWeight: 500}}>
        Loading collection…
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

// Scale doc count → node size (sqrt scaling, clamped)
function docCountToSize(count) {
  const MIN = 12,
    MAX = 38;
  if (count <= 0) return MIN;
  return Math.min(MAX, Math.max(MIN, Math.sqrt(count) * 7));
}

// Apply proportional sizing to theme and subtheme nodes based on document counts.
// Safe to call before docs are loaded (no-ops if docs is empty).
function applyDocCountSizes(graph, docs, originalNodeAttrs) {
  if (!graph || docs.length === 0) return;

  themes.forEach((theme) => {
    const count = docs.filter((d) =>
      d.themes.some((t) => t.toLowerCase() === theme.label.toLowerCase()),
    ).length;
    const size = docCountToSize(count);
    if (graph.hasNode(theme.id)) graph.setNodeAttribute(theme.id, "size", size);
    if (originalNodeAttrs[theme.id]) originalNodeAttrs[theme.id].size = size;
  });

  const SUB_MIN = 4,
    SUB_MAX = 10;
  subthemes.forEach((sub) => {
    const count = docs.filter((d) =>
      d.subthemes.some((s) => s.toLowerCase() === sub.label.toLowerCase()),
    ).length;
    const size =
      count <= 0
        ? SUB_MIN
        : Math.min(SUB_MAX, Math.max(SUB_MIN, Math.sqrt(count) * 4));

    let dominantId = sub.parentThemes[0];
    let dominantCount = 0;
    sub.parentThemes.forEach((tid) => {
      const theme = themes.find((t) => t.id === tid);
      if (!theme) return;
      const n = docs.filter(
        (d) =>
          d.subthemes.some(
            (s) => s.toLowerCase() === sub.label.toLowerCase(),
          ) &&
          d.themes.some((t) => t.toLowerCase() === theme.label.toLowerCase()),
      ).length;
      if (n > dominantCount) {
        dominantCount = n;
        dominantId = tid;
      }
    });

    const color = subthemeColor(sub, dominantId);
    if (graph.hasNode(sub.id)) {
      graph.setNodeAttribute(sub.id, "size", size);
      graph.setNodeAttribute(sub.id, "color", color);
    }
    if (originalNodeAttrs[sub.id]) {
      originalNodeAttrs[sub.id].size = size;
      originalNodeAttrs[sub.id].color = color;
    }
  });
}

export default function SigmaExample({...rest}) {
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const originalNodeAttrsRef = useRef({});
  const docsRef = useRef([]);
  const wrapperRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Keep isFullscreen in sync when the user presses Escape or uses browser controls
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      wrapperRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // Load all documents from v4 collection (metadata inline — no per-manifest fetches)
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch(COLLECTION_URL);
        const collection = await res.json();

        const results = (collection.items ?? []).map((item) => ({
          id: item.id,
          label: item.label?.none?.[0] ?? "Untitled",
          summary: item.summary?.none?.[0] ?? "",
          thumbnail: item.thumbnail?.[0]?.id ?? null,
          homepage: item.homepage?.[0]?.id ?? null,
          themes: getItemMetaValues(item, "Themes"),
          subthemes: getItemMetaValues(item, "Subthemes"),
        }));

        if (!cancelled) {
          docsRef.current = results;
          setDocs(results);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  // Once docs load, resize theme + subtheme nodes by document count and
  // re-color subthemes based on their dominant parent theme.
  // Falls back gracefully if graph isn't built yet (handled in graph effect).
  useEffect(() => {
    if (loading || docs.length === 0 || !graphRef.current) return;
    applyDocCountSizes(graphRef.current, docs, originalNodeAttrsRef.current);
  }, [docs, loading]);

  // Build the Sigma graph
  useEffect(() => {
    if (!containerRef.current) return;
    let renderer;

    const run = async () => {
      const {default: Graph} = await import(GRAPH_CDN_URL);
      const {default: Sigma} = await import(SIGMA_CDN_URL);

      const graph = new Graph();
      graphRef.current = graph;

      // ── Main theme nodes ──────────────────────────────────────────────────
      themes.forEach((theme) => {
        graph.addNode(theme.id, {
          label: theme.label,
          size: 20,
          color: themeColors[theme.id],
          x: fixedPositions[theme.id].x,
          y: fixedPositions[theme.id].y,
        });
      });

      // ── Theme–theme edges ─────────────────────────────────────────────────
      themes.forEach((themeA, i) => {
        themes.forEach((themeB, j) => {
          if (i < j)
            graph.addEdge(themeA.id, themeB.id, {size: 1, color: "#d1d5db"});
        });
      });

      // ── Build per-theme state ─────────────────────────────────────────────
      const themeState = {};
      themes.forEach((theme) => {
        themeState[theme.id] = {
          // Only include subthemes whose PRIMARY parent is this theme — these
          // are the ones positioned (orbiting) near this theme node.
          subnodes: subthemes.filter((s) => s.parentThemes[0] === theme.id),
          subEdgeKeys: [],
          expanded: false,
          mainEdgeKeys: [],
        };
      });

      // ── Subtheme nodes orbiting tightly around their primary parent ───────
      // Group subthemes by primary parent so we can evenly space the orbit
      const subsByPrimary = {};
      subthemes.forEach((sub) => {
        const pid = sub.parentThemes[0];
        if (!subsByPrimary[pid]) subsByPrimary[pid] = [];
        subsByPrimary[pid].push(sub);
      });

      subthemes.forEach((sub) => {
        const pid = sub.parentThemes[0];
        const center = fixedPositions[pid];
        const siblings = subsByPrimary[pid];
        const i = siblings.indexOf(sub);
        const total = siblings.length;
        const angle = (2 * Math.PI * i) / total - Math.PI / 2; // start at top
        // Scale radius so clusters with more subnodes don't overlap
        const RADIUS = 0.09;
        const cx = center.x + Math.cos(angle) * RADIUS;
        const cy = center.y + Math.sin(angle) * RADIUS;
        const color = subthemeColor(sub, null);

        graph.addNode(sub.id, {
          label: sub.label,
          size: 7,
          color,
          x: cx,
          y: cy,
          hidden: true,
        });

        // Edge from each parent theme → subtheme (hidden while theme node is
        // hidden, kept for reference only)
        sub.parentThemes.forEach((tid) => {
          const key = graph.addEdge(tid, sub.id, {
            color: "#e2e8f0",
            size: 0.7,
            hidden: true,
          });
          themeState[tid].subEdgeKeys.push(key);
        });

        // Edges subtheme → every non-parent theme. These ARE visible when the
        // primary parent is expanded because both endpoints (subtheme node +
        // other theme node) remain visible. This is what creates the "web" lines.
        themes.forEach((other) => {
          if (!sub.parentThemes.includes(other.id)) {
            const key = graph.addEdge(sub.id, other.id, {
              color: "#d1d5db",
              size: 0.6,
              hidden: true,
            });
            themeState[pid].subEdgeKeys.push(key);
          }
        });
      });

      // Edges between sibling subthemes (same primary parent) — visible when
      // that theme expands since both sibling nodes are shown together.
      Object.entries(subsByPrimary).forEach(([pid, subs]) => {
        subs.forEach((subA, i) => {
          subs.forEach((subB, j) => {
            if (i < j) {
              const key = graph.addEdge(subA.id, subB.id, {
                color: lightenColor(themeColors[pid], 0.4),
                size: 0.6,
                hidden: true,
              });
              themeState[pid].subEdgeKeys.push(key);
            }
          });
        });
      });

      renderer = new Sigma(graph, containerRef.current, {
        renderEdgeLabels: false,
        labelFont: "DM Sans, sans-serif",
        labelWeight: "400",
        labelColor: {color: "#1e293b"},
        labelBackgroundColor: "rgba(255,255,255,0.85)",
        labelPadding: 4,
        labelRenderedSizeThreshold: 3,
        labelSizeRatio: 3,
        zoomToSizeRatioFunction: (x) => x,
      });

      // Compute mainEdgeKeys (edges to other themes, not to subthemes)
      const subIds = new Set(subthemes.map((s) => s.id));
      themes.forEach((theme) => {
        const state = themeState[theme.id];
        state.mainEdgeKeys = graph
          .edges(theme.id)
          .filter((key) => !subIds.has(graph.opposite(theme.id, key)));
      });

      // ── Visual state ──────────────────────────────────────────────────────
      const FADED_NODE_COLOR = "#d1d5db";
      const FADED_EDGE_COLOR = "#e5e7eb";
      const FADED_NODE_SIZE_FACTOR = 0.85;

      const originalNodeAttrs = originalNodeAttrsRef.current;
      themes.forEach((theme) => {
        originalNodeAttrs[theme.id] = {color: themeColors[theme.id], size: 20};
      });
      subthemes.forEach((sub) => {
        originalNodeAttrs[sub.id] = {color: subthemeColor(sub, null), size: 7};
      });
      // If docs already loaded before graph was built, apply sizes immediately
      applyDocCountSizes(graph, docsRef.current, originalNodeAttrs);
      const originalEdgeAttrs = {};
      graph.edges().forEach((key) => {
        originalEdgeAttrs[key] = {
          color: graph.getEdgeAttribute(key, "color"),
          size: graph.getEdgeAttribute(key, "size"),
        };
      });

      const resetAllVisuals = () => {
        themes.forEach((theme) => {
          graph.setNodeAttribute(
            theme.id,
            "color",
            originalNodeAttrs[theme.id].color,
          );
          graph.setNodeAttribute(
            theme.id,
            "size",
            originalNodeAttrs[theme.id].size,
          );
        });
        subthemes.forEach((sub) => {
          graph.setNodeAttribute(
            sub.id,
            "color",
            originalNodeAttrs[sub.id].color,
          );
          graph.setNodeAttribute(
            sub.id,
            "size",
            originalNodeAttrs[sub.id].size,
          );
        });
        graph.edges().forEach((key) => {
          graph.setEdgeAttribute(key, "color", originalEdgeAttrs[key].color);
          graph.setEdgeAttribute(key, "size", originalEdgeAttrs[key].size);
        });
      };

      const applyFocusVisuals = (focusedTheme) => {
        const focusedState = themeState[focusedTheme.id];
        const activeNodeIds = new Set(
          focusedState.expanded
            ? focusedState.subnodes.map((s) => s.id)
            : [focusedTheme.id],
        );
        const activeEdgeKeys = new Set();
        activeNodeIds.forEach((nodeId) => {
          graph.edges(nodeId).forEach((key) => {
            if (!graph.getEdgeAttribute(key, "hidden")) activeEdgeKeys.add(key);
          });
        });
        themes.forEach((theme) => {
          if (!activeNodeIds.has(theme.id)) {
            graph.setNodeAttribute(theme.id, "color", FADED_NODE_COLOR);
            graph.setNodeAttribute(
              theme.id,
              "size",
              originalNodeAttrs[theme.id].size * FADED_NODE_SIZE_FACTOR,
            );
          }
          themeState[theme.id].subnodes.forEach((sub) => {
            if (!activeNodeIds.has(sub.id)) {
              graph.setNodeAttribute(sub.id, "color", FADED_NODE_COLOR);
              graph.setNodeAttribute(
                sub.id,
                "size",
                originalNodeAttrs[sub.id].size * FADED_NODE_SIZE_FACTOR,
              );
            }
          });
        });
        graph.edges().forEach((key) => {
          if (graph.getEdgeAttribute(key, "hidden")) return;
          if (activeEdgeKeys.has(key)) {
            graph.setEdgeAttribute(
              key,
              "color",
              themeColors[focusedTheme.id] + "99",
            );
            graph.setEdgeAttribute(key, "size", 1.8);
          } else {
            graph.setEdgeAttribute(key, "color", FADED_EDGE_COLOR);
            graph.setEdgeAttribute(key, "size", 0.5);
          }
        });
      };

      const expandTheme = (theme) => {
        const state = themeState[theme.id];
        if (state.expanded) return;
        state.expanded = true;
        graph.setNodeAttribute(theme.id, "hidden", true);
        state.mainEdgeKeys.forEach((key) =>
          graph.setEdgeAttribute(key, "hidden", true),
        );
        state.subnodes.forEach((sub) =>
          graph.setNodeAttribute(sub.id, "hidden", false),
        );
        state.subEdgeKeys.forEach((key) =>
          graph.setEdgeAttribute(key, "hidden", false),
        );
      };

      const collapseTheme = (theme) => {
        const state = themeState[theme.id];
        if (!state.expanded) return;
        state.expanded = false;
        graph.setNodeAttribute(theme.id, "hidden", false);
        state.mainEdgeKeys.forEach((key) =>
          graph.setEdgeAttribute(key, "hidden", false),
        );
        state.subnodes.forEach((sub) =>
          graph.setNodeAttribute(sub.id, "hidden", true),
        );
        state.subEdgeKeys.forEach((key) =>
          graph.setEdgeAttribute(key, "hidden", true),
        );
      };

      const EXPAND_ZOOM_RATIO = 1 / 1.8;

      renderer.getCamera().on("updated", () => {
        const camera = renderer.getCamera();
        const {ratio} = camera.getState();
        const zoomedIn = ratio < EXPAND_ZOOM_RATIO;

        if (!zoomedIn) {
          themes.forEach((theme) => collapseTheme(theme));
          resetAllVisuals();
          return;
        }

        // Find whichever theme node is nearest to the current viewport center
        // and expand only that one. No proximity cutoff — always expand the
        // nearest theme so subthemes appear immediately on any zoom-in.
        const containerWidth = containerRef.current.offsetWidth;
        const containerHeight = containerRef.current.offsetHeight;
        const graphCenter = renderer.viewportToGraph({
          x: containerWidth / 2,
          y: containerHeight / 2,
        });

        let closest = null;
        let closestDist = Infinity;
        themes.forEach((theme) => {
          const pos = fixedPositions[theme.id];
          const dx = pos.x - graphCenter.x;
          const dy = pos.y - graphCenter.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < closestDist) {
            closestDist = dist;
            closest = theme;
          }
        });

        themes.forEach((theme) => {
          if (theme.id === closest.id) expandTheme(theme);
          else collapseTheme(theme);
        });
        resetAllVisuals();
        applyFocusVisuals(closest);
      });

      // Click a theme or subtheme node → open doc panel
      renderer.on("clickNode", ({node}) => {
        const theme = themes.find((t) => t.id === node);
        const sub = subthemes.find((s) => s.id === node);

        if (theme) {
          setSelectedNode((prev) =>
            prev?.id === theme.id
              ? null
              : {nodeType: "theme", ...theme},
          );
        } else if (sub) {
          setSelectedNode((prev) =>
            prev?.id === sub.id
              ? null
              : {nodeType: "subtheme", ...sub},
          );
        }
      });

      // Click background → close panel
      renderer.on("clickStage", () => {
        setSelectedNode(null);
      });
    };

    void run();
    return () => {
      renderer?.kill?.();
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: isFullscreen ? "#fff" : undefined,
      }}
    >
      {loading && <LoadingOverlay />}

      {/* Fullscreen toggle button */}
      <button
        onClick={toggleFullscreen}
        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          zIndex: 15,
          background: "rgba(255,255,255,0.9)",
          border: "1px solid #e2e8f0",
          borderRadius: "6px",
          width: "32px",
          height: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
          padding: 0,
        }}
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFullscreen ? (
          // Compress icon
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
            <path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
          </svg>
        ) : (
          // Expand icon
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
            <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
          </svg>
        )}
      </button>

      <div
        ref={containerRef}
        style={{
          width: selectedNode ? "calc(100% - 360px)" : "100%",
          height: "100%",
          transition: "width 0.3s ease",
        }}
        {...rest}
      />

      {selectedNode && !loading && (
        <DocPanel
          selectedNode={selectedNode}
          docs={docs}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {/* Hint */}
      {!loading && !selectedNode && (
        <div
          style={{
            position: "absolute",
            bottom: "16px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(15,23,42,0.75)",
            color: "#fff",
            fontSize: "12px",
            padding: "6px 14px",
            borderRadius: "20px",
            pointerEvents: "none",
            fontFamily: "'DM Sans', sans-serif",
            letterSpacing: "0.02em",
            whiteSpace: "nowrap",
          }}
        >
          Click a theme to browse documents · zoom in to reveal subthemes
        </div>
      )}
    </div>
  );
}