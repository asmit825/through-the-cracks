import React from 'react';
import Icon from './Icon';

/**
 * Shared pager for the Artists and Episodes tables. Renders nothing until the
 * caller has pagination metadata, so views can hand it a possibly-undefined
 * `pagination` object without guarding first.
 */
export default function Pagination({ pagination, page, onPageChange, noun, idPrefix }) {
  if (!pagination) return null;

  const { totalPages, total } = pagination;

  return (
    <nav className="pagination" aria-label={`${noun} pagination`}>
      <div className="pagination-status">
        Page <strong>{pagination.page}</strong> of <strong>{totalPages}</strong>
        {' · '}
        <strong>{total?.toLocaleString()}</strong> {noun}
      </div>

      <div className="pagination-actions">
        <button
          id={`${idPrefix}-prev-btn`}
          className="btn btn-outline btn-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(p => Math.max(1, p - 1))}
        >
          <Icon name="chevron_left" size="sm" />
          Previous
        </button>
        <button
          id={`${idPrefix}-next-btn`}
          className="btn btn-outline btn-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(p => p + 1)}
        >
          Next
          <Icon name="chevron_right" size="sm" />
        </button>
      </div>
    </nav>
  );
}
