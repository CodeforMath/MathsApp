async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      msg = (await res.json()).error || msg;
    } catch {
      /* bỏ qua */
    }
    throw new Error(msg);
  }
  return res.json();
}

function resource(name) {
  return {
    list: () => request('GET', `/api/${name}`),
    get: (id) => request('GET', `/api/${name}/${id}`),
    create: (data) => request('POST', `/api/${name}`, data),
    update: (id, data) => request('PUT', `/api/${name}/${id}`, data),
    remove: (id) => request('DELETE', `/api/${name}/${id}`),
  };
}

export const api = {
  lectures: resource('lectures'),
  questions: { ...resource('questions'), bulk: (list) => request('POST', '/api/questions/bulk', list) },
  exams: resource('exams'),
  images: {
    list: () => request('GET', '/api/images'),
    remove: (id) => request('DELETE', `/api/images/${id}`),
    saveDataUrl: (dataUrl, name) => request('POST', '/api/images/data', { dataUrl, name }),
    upload: async (file) => {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/images/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Tải ảnh thất bại');
      return res.json();
    },
  },
};
