async function request(url, options) {
  const res = await fetch(url, options)
  if (res.status === 204) return null

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const error = new Error(data?.error || `Request failed (${res.status})`)
    error.status = res.status
    throw error
  }
  return data
}

export async function getNotes() {
  const data = await request('/api/notes')
  return Array.isArray(data?.notes) ? data.notes : []
}

export async function createNote({ title = '', cover = '', shelf = '', content = '' } = {}) {
  const data = await request('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, cover, shelf, content }),
  })
  return data?.note ?? null
}

export async function updateNote(id, patch) {
  const data = await request(`/api/notes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  return data?.note ?? null
}

export async function uploadImage(file) {
  const res = await fetch('/api/uploads', {
    method: 'POST',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const error = new Error(data?.error || `Upload failed (${res.status})`)
    error.status = res.status
    throw error
  }
  return data?.url ?? null
}

export function deleteNote(id) {
  return request(`/api/notes/${id}`, { method: 'DELETE' })
}
