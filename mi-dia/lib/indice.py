import os
import sqlite3

import lib.config as config


def _ruta_db():
    return os.path.join(config.RAIZ_PROCESO, "indice.db")


def _conectar():
    conn = sqlite3.connect(_ruta_db(), check_same_thread=False)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS atenciones (
            id            TEXT PRIMARY KEY,
            tracking_id   TEXT,
            tracking_code TEXT,
            tipo          TEXT,
            titulo        TEXT,
            estado        TEXT,
            numero        TEXT,
            actualizado   TEXT
        )
    """)
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_tid ON atenciones(tracking_id COLLATE NOCASE)")
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_tc  ON atenciones(tracking_code COLLATE NOCASE)")
    conn.commit()
    return conn


def _upsert(conn, datos):
    conn.execute("""
        INSERT OR REPLACE INTO atenciones
            (id, tracking_id, tracking_code, tipo, titulo, estado, numero, actualizado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        datos.get("id_herramienta", ""),
        datos.get("tracking_id", ""),
        datos.get("tracking_code", ""),
        datos.get("tipo", ""),
        datos.get("titulo", ""),
        datos.get("estado", ""),
        datos.get("numero", ""),
        datos.get("actualizado", ""),
    ))


def init_indice(registros):
    conn = _conectar()
    for r in registros:
        _upsert(conn, r["datos"])
    conn.commit()
    conn.close()


def indexar_atencion(datos):
    conn = _conectar()
    _upsert(conn, datos)
    conn.commit()
    conn.close()


def buscar(q):
    q = (q or "").strip()
    if not q:
        return []
    patron = q.upper() + "%"
    conn = _conectar()
    cursor = conn.execute("""
        SELECT id, tracking_id, tracking_code, tipo, titulo, estado, numero
        FROM   atenciones
        WHERE  tracking_id   LIKE ? COLLATE NOCASE
            OR tracking_code LIKE ? COLLATE NOCASE
        ORDER  BY actualizado DESC
        LIMIT  8
    """, (patron, patron))
    resultados = [
        {
            "id":            row[0],
            "tracking_id":   row[1],
            "tracking_code": row[2],
            "tipo":          row[3],
            "titulo":        row[4],
            "estado":        row[5],
            "numero":        row[6],
        }
        for row in cursor.fetchall()
    ]
    conn.close()
    return resultados
