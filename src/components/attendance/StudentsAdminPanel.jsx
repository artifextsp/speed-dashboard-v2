import { useMemo, useState } from "react";
import {
  IconCheck,
  IconPencil,
  IconPlus,
  IconUserCheck,
  IconUserOff,
  IconX,
} from "@tabler/icons-react";
import { useStudents } from "../../hooks/useStudents";

const EMPTY_FORM = { full_name: "", id_number: "", email: "" };

export function StudentsAdminPanel({ user, onClose, onNotify }) {
  const {
    students,
    loading,
    createStudent,
    updateStudent,
    deactivateStudent,
    activateStudent,
  } = useStudents(user);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [saving, setSaving] = useState(false);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((student) => {
      if (statusFilter === "active" && !student.active) return false;
      if (statusFilter === "inactive" && student.active) return false;
      if (!query) return true;
      const haystack = [
        student.full_name,
        student.id_number,
        student.email,
        student.student_code,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [students, search, statusFilter]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.full_name.trim() || !form.id_number.trim()) {
      onNotify?.("Nombre e identificación son obligatorios", true);
      return;
    }
    setSaving(true);
    try {
      const created = await createStudent(form);
      setForm(EMPTY_FORM);
      onNotify?.(`Estudiante registrado. Código asignado: ${created.student_code}`);
    } catch (err) {
      onNotify?.(err.message || "Error al registrar estudiante", true);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (student) => {
    setEditingId(student.id);
    setEditForm({
      full_name: student.full_name,
      id_number: student.id_number,
      email: student.email || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(EMPTY_FORM);
  };

  const handleSaveEdit = async (studentId) => {
    if (!editForm.full_name.trim() || !editForm.id_number.trim()) {
      onNotify?.("Nombre e identificación son obligatorios", true);
      return;
    }
    setSaving(true);
    try {
      await updateStudent(studentId, editForm);
      cancelEdit();
      onNotify?.("Estudiante actualizado");
    } catch (err) {
      onNotify?.(err.message || "Error al actualizar estudiante", true);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (student) => {
    const ok = window.confirm(
      `¿Desactivar a ${student.full_name}?\n\nEl código ${student.student_code} dejará de aparecer en nuevos llamados.`
    );
    if (!ok) return;
    try {
      await deactivateStudent(student.id);
      if (editingId === student.id) cancelEdit();
      onNotify?.("Estudiante desactivado");
    } catch (err) {
      onNotify?.(err.message || "Error al desactivar", true);
    }
  };

  const handleReactivate = async (student) => {
    try {
      await activateStudent(student.id);
      onNotify?.(`Estudiante ${student.student_code} reactivado`);
    } catch (err) {
      onNotify?.(err.message || "Error al reactivar", true);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide attendance-admin" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h2>Estudiantes del piloto</h2>
            <p className="modal__subtitle">
              Administra participantes del piloto. Cada uno tiene un código fijo de 4 dígitos
              visible en el sitio público (sin nombre ni datos sensibles).
            </p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar">
            <IconX size={18} />
          </button>
        </div>

        <form className="attendance-admin__form" onSubmit={handleSubmit}>
          <h3 className="attendance-admin__section-title">Registrar estudiante</h3>
          <div className="attendance-admin__form-grid">
            <label>
              Nombre completo
              <input
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                placeholder="Ej. María García López"
                required
              />
            </label>
            <label>
              Número de identificación
              <input
                value={form.id_number}
                onChange={(e) => setForm((f) => ({ ...f, id_number: e.target.value }))}
                placeholder="Ej. 1020304050"
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="correo@ejemplo.com"
              />
            </label>
          </div>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            <IconPlus size={16} /> {saving ? "Guardando…" : "Registrar estudiante"}
          </button>
        </form>

        <div className="attendance-admin__list">
          <div className="attendance-admin__toolbar">
            <h3 className="attendance-admin__section-title">Listado ({filteredStudents.length})</h3>
            <div className="attendance-admin__filters">
              <input
                type="search"
                className="attendance-admin__search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, código, ID o email"
              />
              <select
                className="attendance-admin__filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p className="attendance-empty">Cargando estudiantes…</p>
          ) : filteredStudents.length === 0 ? (
            <p className="attendance-empty">
              {students.length === 0
                ? "Aún no hay estudiantes registrados."
                : "No hay resultados con ese filtro."}
            </p>
          ) : (
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Identificación</th>
                  <th>Email</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const isEditing = editingId === student.id;
                  return (
                    <tr key={student.id} className={!student.active ? "is-inactive" : ""}>
                      <td>
                        <span className="attendance-code">{student.student_code}</span>
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="attendance-inline-input"
                            value={editForm.full_name}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, full_name: e.target.value }))
                            }
                          />
                        ) : (
                          student.full_name
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="attendance-inline-input"
                            value={editForm.id_number}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, id_number: e.target.value }))
                            }
                          />
                        ) : (
                          student.id_number
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="email"
                            className="attendance-inline-input"
                            value={editForm.email}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, email: e.target.value }))
                            }
                          />
                        ) : (
                          student.email || "—"
                        )}
                      </td>
                      <td>{student.active ? "Activo" : "Inactivo"}</td>
                      <td>
                        <div className="attendance-row-actions">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                className="btn-icon"
                                title="Guardar cambios"
                                disabled={saving}
                                onClick={() => handleSaveEdit(student.id)}
                              >
                                <IconCheck size={16} />
                              </button>
                              <button
                                type="button"
                                className="btn-icon"
                                title="Cancelar"
                                onClick={cancelEdit}
                              >
                                <IconX size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="btn-icon"
                                title="Editar"
                                onClick={() => startEdit(student)}
                              >
                                <IconPencil size={16} />
                              </button>
                              {student.active ? (
                                <button
                                  type="button"
                                  className="btn-icon btn-icon--danger"
                                  title="Desactivar"
                                  onClick={() => handleDeactivate(student)}
                                >
                                  <IconUserOff size={16} />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn-icon"
                                  title="Reactivar"
                                  onClick={() => handleReactivate(student)}
                                >
                                  <IconUserCheck size={16} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
