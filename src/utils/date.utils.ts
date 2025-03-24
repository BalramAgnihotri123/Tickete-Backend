export const isValidDate = (date: string): boolean => {
    return !isNaN(new Date(date).getTime());
}

export const formatDate = (date: string): string => {
    return new Date(date).toISOString().split('T')[0];
}