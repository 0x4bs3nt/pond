import { useRef, useState } from 'react';
import { theme } from '../../theme';
import { createDraft, profileFields, tlsModes, validateDraft } from './profile-draft';
import { useProfileFormKeyboard } from './use-profile-form-keyboard';
import type { ProfileErrors, ProfileFormProps } from './types';

export const ProfileForm = ({ profile, enabled, isActive, onSave, onCancel }: ProfileFormProps) => {
    const [draft, setDraft] = useState(() => createDraft(profile));
    const [errors, setErrors] = useState<ProfileErrors>({});
    const [field, setField] = useState(0);

    const draftRef = useRef(draft);

    const change = (next: typeof draft) => {
        draftRef.current = next;
        setDraft(next);
    };

    const save = () => {
        if (!isActive()) return;

        const result = validateDraft(draftRef.current);
        setErrors(result.errors);

        if (result.profile) onSave(result.profile);
        else
            setField(
                Math.max(
                    0,
                    profileFields.findIndex(([name]) => result.errors[name])
                )
            );
    };

    const cancel = () => {
        if (isActive()) onCancel();
    };

    const onTLS = (reverse: boolean) => {
        if (!isActive()) return;
    
        const current = draftRef.current;
        change({ ...current, tls: tlsModes[(tlsModes.indexOf(current.tls) + (reverse ? 2 : 1)) % 3]! });
    };

    useProfileFormKeyboard({ isActive, field, setField, onTLS, onSave: save, onCancel: cancel });

    return (
        <box flexDirection="column" flexShrink={0}>
            <text height={1} fg={theme.accent}>
                {profile ? 'Edit connection' : 'New connection'}
            </text>
            {profileFields.map(([name, label], index) => (
                <box key={name} height={2} flexDirection="column">
                    <box
                        height={1}
                        flexDirection="row"
                        onMouseDown={() => {
                            if (isActive()) setField(index);
                        }}
                    >
                        <text width={12} fg={field === index ? theme.accent : theme.muted}>
                            {label}
                        </text>
                        <input
                            flexGrow={1}
                            value={draft[name]}
                            focused={enabled && field === index}
                            maxLength={255}
                            onInput={(value) => {
                                if (isActive()) change({ ...draftRef.current, [name]: value });
                            }}
                            textColor={theme.text}
                            backgroundColor={theme.panel}
                        />
                    </box>
                    <text height={1} fg={theme.modified} wrapMode="none">
                        {errors[name] ?? ''}
                    </text>
                </box>
            ))}
            <text
                height={1}
                fg={field === 5 ? theme.accent : theme.text}
                onMouseDown={() => {
                    if (isActive()) {
                        setField(5);
                        onTLS(false);
                    }
                }}
            >
                {`TLS         ${draft.tls} · ←/→ or click to change`}
            </text>
            <text height={1} fg={theme.muted} wrapMode="none">
                {draft.tls === 'verify-full'
                    ? 'Verify certificate and hostname using trusted CAs.'
                    : draft.tls === 'require'
                      ? 'Encrypted; server identity is not verified.'
                      : 'TLS disabled; connection is not encrypted.'}
            </text>
            <box height={1} flexDirection="row">
                <text fg={enabled ? theme.accent : theme.muted} onMouseDown={save}>
                    {' '}
                    Ctrl+S Save{' '}
                </text>
                <text fg={enabled ? theme.accent : theme.muted} onMouseDown={cancel}>
                    {' '}
                    Esc Cancel{' '}
                </text>
            </box>
        </box>
    );
};
