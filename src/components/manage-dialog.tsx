'use client';
import { useState, type CSSProperties } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { COLORS, type Label, type Member } from '@/lib/types';
import type { Repository } from '@/lib/repository';
import { Avatar, Dialog } from './ui';
export function ManageDialog({
  kind,
  items,
  busy,
  mutate,
  onClose,
}: {
  kind: 'members' | 'labels';
  items: Member[] | Label[];
  busy: boolean;
  mutate: (action: (repo: Repository) => Promise<void>, message: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [remove, setRemove] = useState<string | null>(null);
  const members = kind === 'members';
  return (
    <Dialog
      title={members ? 'Better, together.' : 'A place for everything.'}
      subtitle={
        members
          ? 'Add people to your private workspace and give every task an owner.'
          : 'A few thoughtful labels can bring a whole board into focus.'
      }
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="manage-content">
        <p className="manage-note">
          {members
            ? 'Members are task assignees, not login accounts. This board stays private to your guest session.'
            : 'Labels can be assigned to multiple tasks and used to filter your board.'}
        </p>
        <div className="manage-list">
          {items.map((item) => (
            <div className="manage-row" key={item.id}>
              {members ? (
                <Avatar member={item} />
              ) : (
                <span className="large-label-dot" style={{ backgroundColor: item.color }} />
              )}
              <span>{item.name}</span>
              <button
                className="icon-button danger-hover"
                aria-label={`Remove ${item.name}`}
                disabled={busy}
                onClick={() => setRemove(item.id)}
              >
                <Trash2 size={15} />
              </button>
              {remove === item.id && (
                <div className="remove-confirm">
                  <p>
                    Remove {item.name}? This will also remove{' '}
                    {members ? 'their assignments' : 'this label'} from tasks.
                  </p>
                  <button className="text-button" disabled={busy} onClick={() => setRemove(null)}>
                    Cancel
                  </button>
                  <button
                    className="text-button danger-text"
                    disabled={busy}
                    onClick={async () => {
                      if (
                        await mutate(
                          (repo) =>
                            members ? repo.deleteMember(item.id) : repo.deleteLabel(item.id),
                          members ? 'Member removed' : 'Label removed',
                        )
                      )
                        setRemove(null);
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
          {!items.length && (
            <p className="conversation-empty">
              {members
                ? 'Your next great collaboration starts here.'
                : 'Start with a label like Design, Bug, or Feature.'}
            </p>
          )}
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              await mutate(
                (repo) => (members ? repo.addMember(name, color) : repo.addLabel(name, color)),
                members ? 'Member added' : 'Label created',
              )
            )
              setName('');
          }}
        >
          <label className="field-label" htmlFor="item-name">
            {members ? 'Member name' : 'Label name'}
          </label>
          <div className="add-item-row">
            <input
              id="item-name"
              data-autofocus
              placeholder={members ? 'e.g. Jordan Lee' : 'e.g. Design'}
              maxLength={members ? 60 : 24}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
              required
            />
            <button className="button button-primary" type="submit" disabled={busy || !name.trim()}>
              <Plus size={15} />
              Add {members ? 'member' : 'label'}
            </button>
          </div>
          <div className="color-options" role="group" aria-label="Choose a color">
            {COLORS.map((value, index) => (
              <button
                key={value}
                type="button"
                aria-label={`Color ${index + 1}`}
                aria-pressed={value === color}
                className="color-option"
                style={{ '--swatch': value } as CSSProperties}
                onClick={() => setColor(value)}
                disabled={busy}
              >
                {value === color && <Check size={15} />}
              </button>
            ))}
          </div>
        </form>
      </div>
    </Dialog>
  );
}
