const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All tag routes require authentication
router.use(authenticateToken);

// GET /api/tags - Get all tags for the logged-in user with usage count
router.get('/', async (req, res) => {
    const { id: userId } = req.user;
    try {
        const [tags] = await pool.execute(
            `SELECT 
                t.id, t.name, t.color, t.user_id, COUNT(kbt.knowledge_base_id) as usage_count,
                COUNT(kbt.knowledge_base_id) as file_count
            FROM tags t
            LEFT JOIN knowledge_base_tags kbt ON t.id = kbt.tag_id
            WHERE t.user_id = ?
            GROUP BY t.id
            ORDER BY t.name`,
            [userId]
        );
        res.json(tags);
    } catch (error) {
        console.error('Failed to get tags:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// POST /api/tags - Create a new tag
router.post('/', async (req, res) => {
    const { name, color } = req.body;
    const { id: userId } = req.user;

    if (!name || !color) {
        return res.status(400).json({ message: 'Tag name and color are required.' });
    }

    try {
        const [result] = await pool.execute(
            'INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?)',
            [userId, name, color]
        );
        const newTagId = result.insertId;
        res.status(201).json({ id: newTagId, user_id: userId, name, color });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'A tag with this name already exists.' });
        }
        console.error('Failed to create tag:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// DELETE /api/tags/:id - Delete a tag
router.delete('/:id', async (req, res) => {
    const { id: tagId } = req.params;
    const { id: userId } = req.user;

    try {
        // Verify the tag belongs to the user before deleting
        const [tags] = await pool.execute(
            'SELECT * FROM tags WHERE id = ? AND user_id = ?',
            [tagId, userId]
        );

        if (tags.length === 0) {
            return res.status(404).json({ message: 'Tag not found or you do not have permission to delete it.' });
        }

        await pool.execute('DELETE FROM tags WHERE id = ?', [tagId]);
        // The ON DELETE CASCADE in the knowledge_base_tags table will handle orphaned entries.
        res.status(204).send(); // No Content
    } catch (error) {
        console.error(`Failed to delete tag ${tagId}:`, error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router; 