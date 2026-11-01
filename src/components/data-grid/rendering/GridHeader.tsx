import { theme } from '../../../theme';
import type { GridHeaderProps } from '../types';

export const GridHeader = ({ columns, left, width, gutter, focused }: GridHeaderProps) => (
    <box height={2} flexShrink={0} flexDirection="row" backgroundColor={theme.raised}>
        <text width={gutter} fg={focused ? theme.accent : theme.muted} selectable={false}>
            {'  #\n' + (focused ? '  ●' : '  ○')}
        </text>
        <box width={width} height={2} flexShrink={0} overflow="hidden">
            {columns.map((column) => (
                <box
                    key={column.id}
                    position="absolute"
                    left={column.left - left}
                    top={0}
                    width={column.width}
                    height={2}
                    paddingLeft={1}
                    paddingRight={1}
                    overflow="hidden"
                >
                    <text height={1} wrapMode="none" selectable={false} fg={theme.accent}>
                        {column.name}
                    </text>
                    <text height={1} wrapMode="none" selectable={false} fg={theme.muted}>
                        {column.type}
                    </text>
                </box>
            ))}
        </box>
    </box>
);
