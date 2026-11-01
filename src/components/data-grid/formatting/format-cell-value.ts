export const formatCellValue = (value: string | null | undefined): string => {
    if (value === null) return 'NULL';
    if (value === '') return "''";

    return (value ?? '').replace(/[\r\n\t]/g, ' ');
};
