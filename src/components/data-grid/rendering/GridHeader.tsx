import { formatCellValue } from '../formatting/format-cell-value';
import { theme } from '../../../theme';
import type { GridHeaderProps } from '../types';

export const GridHeader = ({ columns, left, width, gutter, focused }: GridHeaderProps) => (
    <box height={2} flexShrink={0} flexDirection="row" backgroundColor={theme.raised}>
        <text width={gutter} fg={focused ? theme.accent : theme.muted} selectable={false}>
            {'  #\n' + (focused ? '  ●' : '  ○')}
        </text>
        <box width={width} height={2} flexShrink={0} overflow="hidden">
            {columns.map((column, slot) => (
                <box
                    key={slot}
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
                        {formatCellValue(column.name, column.width)}
                    </text>
                    <text height={1} wrapMode="none" selectable={false} fg={theme.muted}>
                        {formatCellValue(column.type, column.width)}
                    </text>
                </box>
            ))}
        </box>
    </box>
);
