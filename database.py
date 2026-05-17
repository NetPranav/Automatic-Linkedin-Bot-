"""
database.py
-----------
Simple in-memory database using a dictionary + SQLite persistence.

We use an in-memory dict for speed during processing, and SQLite
as a persistent backup so drafts survive server restarts.

For an 8GB VRAM machine doing personal use, this is perfectly sufficient.
If you need to scale later, swap this for PostgreSQL or MongoDB.
"""

import sqlite3
import json
import logging
from datetime import datetime
from typing import Dict, Optional, List
from pathlib import Path

from models import Draft, DraftStatus

logger = logging.getLogger(__name__)

# Path to SQLite database file
DB_PATH = "drafts.db"

# In-memory store: { draft_id: Draft }
# This is our primary fast-access store
_drafts_store: Dict[str, Draft] = {}


def init_database():
    """
    Initialize SQLite database and create tables if they don't exist.
    Also loads any existing drafts from SQLite into memory on startup.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create the drafts table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS drafts (
            id TEXT PRIMARY KEY,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            data JSON NOT NULL
        )
    """)

    conn.commit()

    # Load existing non-terminal drafts back into memory on restart
    # This ensures we don't lose "awaiting_approval" drafts on server restart
    cursor.execute("""
        SELECT id, data FROM drafts
        WHERE status NOT IN ('posted', 'rejected')
    """)

    rows = cursor.fetchall()
    for row in rows:
        try:
            draft_data = json.loads(row[1])
            draft = Draft(**draft_data)
            _drafts_store[draft.id] = draft
            logger.info(f"Restored draft {draft.id} from SQLite (status: {draft.status})")
        except Exception as e:
            logger.error(f"Failed to restore draft {row[0]}: {e}")

    conn.close()
    logger.info(f"Database initialized. Loaded {len(_drafts_store)} active drafts into memory.")


def save_draft(draft: Draft):
    """
    Save or update a draft in both memory and SQLite.
    Always call this after modifying a draft.
    """
    # Update in-memory store
    _drafts_store[draft.id] = draft

    # Persist to SQLite
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT OR REPLACE INTO drafts (id, status, created_at, updated_at, data)
            VALUES (?, ?, ?, ?, ?)
        """, (
            draft.id,
            draft.status.value,
            draft.created_at.isoformat(),
            draft.updated_at.isoformat(),
            draft.model_dump_json()  # Serialize entire Pydantic model to JSON
        ))
        conn.commit()
        logger.debug(f"Draft {draft.id} saved to SQLite with status: {draft.status}")
    except Exception as e:
        logger.error(f"Failed to save draft {draft.id} to SQLite: {e}")
        raise
    finally:
        conn.close()


def get_draft(draft_id: str) -> Optional[Draft]:
    """Retrieve a single draft by ID from memory."""
    return _drafts_store.get(draft_id)


def get_all_drafts() -> List[Draft]:
    """Return all drafts currently in memory."""
    return list(_drafts_store.values())


def get_drafts_awaiting_approval() -> List[Draft]:
    """Return all drafts that are ready for user approval."""
    return [
        draft for draft in _drafts_store.values()
        if draft.status == DraftStatus.AWAITING_APPROVAL
    ]


def delete_draft(draft_id: str):
    """
    Remove a draft from memory and mark as rejected in SQLite.
    We keep it in SQLite for audit purposes but remove from active memory.
    """
    if draft_id in _drafts_store:
        del _drafts_store[draft_id]

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE drafts SET status = 'rejected' WHERE id = ?",
            (draft_id,)
        )
        conn.commit()
        logger.info(f"Draft {draft_id} marked as rejected in SQLite and removed from memory.")
    except Exception as e:
        logger.error(f"Failed to update rejected status for draft {draft_id}: {e}")
    finally:
        conn.close()


def update_draft_status(draft_id: str, status: DraftStatus):
    """Convenience function to update just the status of a draft."""
    draft = get_draft(draft_id)
    if draft:
        draft.status = status
        draft.updated_at = datetime.utcnow()
        save_draft(draft)