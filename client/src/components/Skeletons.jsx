import { Box, Card, CardContent, Skeleton, Stack, Table, TableBody, TableCell, TableRow } from '@mui/material';

export function TableSkeleton({ columns = 4, rows = 6 }) {
  return (
    <Table>
      <TableBody>
        {Array.from({ length: rows }).map((_, r) => (
          <TableRow key={r}>
            {Array.from({ length: columns }).map((_, c) => (
              <TableCell key={c}>
                <Skeleton variant="text" width={c === 0 ? '60%' : '80%'} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function CardListSkeleton({ count = 3 }) {
  return (
    <Stack spacing={2}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} variant="outlined">
          <CardContent>
            <Skeleton variant="text" width="30%" />
            <Skeleton variant="text" width="70%" height={28} sx={{ mt: 0.5 }} />
            <Skeleton variant="text" width="40%" />
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}

export function ChartSkeleton({ height = 320 }) {
  return (
    <Box>
      <Skeleton variant="rounded" height={height} sx={{ borderRadius: 2 }} />
      <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" width={90} height={32} sx={{ borderRadius: 4 }} />
        ))}
      </Stack>
    </Box>
  );
}

export function StatRowSkeleton({ count = 3 }) {
  return (
    <Stack direction="row" spacing={2} flexWrap="wrap">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="rounded" width={140} height={72} sx={{ borderRadius: 3 }} />
      ))}
    </Stack>
  );
}
