import { IconTrash, IconPlus } from "@tabler/icons-react";
import { PHASE_COLORS } from "../../../utils/constants";

const TIMING_OPTIONS = [
  { value: "antes", label: "Antes de la sesión" },
  { value: "durante", label: "Durante la sesión" },
  { value: "referencia", label: "Referencia posterior" },
];

export function VideoEditor({ videos = [], onChange }) {
  const addVideo = () =>
    onChange([
      ...videos,
      {
        title: "",
        youtube_url: "",
        duration: "",
        description: "",
        timing: "durante",
        sort_order: videos.length,
      },
    ]);

  const updateVideo = (idx, key, val) => {
    const updated = [...videos];
    updated[idx] = { ...updated[idx], [key]: val };
    onChange(updated);
  };

  const removeVideo = (idx) => onChange(videos.filter((_, i) => i !== idx));

  return (
    <div className="field">
      <label className="field__label">Videotutoriales</label>
      <div className="video-editor">
        {videos.map((v, idx) => (
          <div key={idx} className="video-editor__card">
            <div className="video-editor__row">
              <input
                className="input input--sm"
                value={v.title || ""}
                onChange={(e) => updateVideo(idx, "title", e.target.value)}
                placeholder="Título del video"
                style={{ flex: 2 }}
              />
              <input
                className="input input--sm"
                value={v.duration || ""}
                onChange={(e) => updateVideo(idx, "duration", e.target.value)}
                placeholder="12:30"
                style={{ width: 70 }}
              />
              <select
                className="select select--sm"
                value={v.timing || "durante"}
                onChange={(e) => updateVideo(idx, "timing", e.target.value)}
              >
                {TIMING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                className="btn-icon btn-icon--danger"
                onClick={() => removeVideo(idx)}
              >
                <IconTrash size={14} />
              </button>
            </div>
            <input
              className="input input--sm"
              value={v.youtube_url || ""}
              onChange={(e) => updateVideo(idx, "youtube_url", e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
            <input
              className="input input--sm"
              value={v.description || ""}
              onChange={(e) => updateVideo(idx, "description", e.target.value)}
              placeholder="Descripción breve"
            />
          </div>
        ))}
        <button
          className="btn-add"
          onClick={addVideo}
          style={{ color: PHASE_COLORS.A }}
        >
          <IconPlus size={14} /> Agregar video
        </button>
      </div>
    </div>
  );
}
