import { theme } from '../../../theme';
import { formatCellValue } from '../formatting/format-cell-value';

type GridCellProps = {
    value: string | null | undefined;
    left: number;
    width: number;
    selected: boolean;
    focused: boolean;
    onSelect: () => void;
};

export const GridCell = ({ value, left, width, selected, focused, onSelect }: GridCellProps) => (
    <box
        position="absolute"
        left={left}
        top={0}
        width={width}
        height={1}
        paddingLeft={1}
        paddingRight={1}
        overflow="hidden"
        backgroundColor={selected ? (focused ? theme.selection : theme.raised) : undefined}
        onMouseDown={(event) => {
            if (event.button === 0) onSelect();
        }}
    >
        <text height={1} wrapMode="none" selectable={false} fg={value === null ? theme.muted : theme.text}>
            {formatCellValue(value)}
        </text>
    </box>
);
