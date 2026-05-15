"""Add vigencia_fim column to contratos

Revision ID: a1b2c3d4e5f6
Revises: f54674e70a57
Create Date: 2026-05-15 03:00:00.000000

Objetivo:
    Adiciona a coluna física `vigencia_fim` (Date, indexável) à tabela `contratos`
    como projeção operacional do campo JSONB `raw_contract->>'vigencia_fim'`.

    A data migration converte automaticamente os registros existentes do formato
    dd/mm/yyyy (padrão Comprasnet) para Date, tolerando registros inválidos.

Compatibilidade:
    - Backward compatible: coluna nullable
    - Registros com JSON inválido ou data ausente ficam com vigencia_fim = NULL
    - Não remove raw_contract nem altera nenhum campo existente
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'f54674e70a57'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ─── 1. Adicionar coluna ─────────────────────────────────────────────────
    op.add_column(
        'contratos',
        sa.Column('vigencia_fim', sa.Date(), nullable=True)
    )

    # ─── 2. Criar índice ─────────────────────────────────────────────────────
    op.create_index(
        'ix_contratos_vigencia_fim',
        'contratos',
        ['vigencia_fim'],
        unique=False
    )

    # ─── 3. Data Migration: JSONB → coluna física ────────────────────────────
    #
    # Estratégia:
    #   - Para cada contrato com raw_contract->>'vigencia_fim' preenchido,
    #     tenta converter para DATE usando TO_DATE com formato DD/MM/YYYY.
    #   - Registros com formato inválido ou null são silenciosamente ignorados
    #     (vigencia_fim permanece NULL).
    #   - Usa bloco DO $$ com EXCEPTION para isolamento por-registro.
    #
    # Nota: TO_DATE('2026-12-31', 'DD/MM/YYYY') falha no PG — por isso o bloco
    # tenta primeiro dd/mm/yyyy e, em caso de exceção, tenta yyyy-mm-dd.
    # ─────────────────────────────────────────────────────────────────────────
    op.execute("""
        DO $$
        DECLARE
            rec RECORD;
            parsed_date DATE;
            raw_val     TEXT;
        BEGIN
            FOR rec IN
                SELECT id, raw_contract->>'vigencia_fim' AS vf
                FROM contratos
                WHERE raw_contract->>'vigencia_fim' IS NOT NULL
                  AND raw_contract->>'vigencia_fim' <> ''
            LOOP
                raw_val := LEFT(rec.vf, 10);
                parsed_date := NULL;

                -- Tenta formato BR: DD/MM/YYYY
                BEGIN
                    parsed_date := TO_DATE(raw_val, 'DD/MM/YYYY');
                EXCEPTION WHEN OTHERS THEN
                    NULL;
                END;

                -- Se falhou, tenta formato ISO: YYYY-MM-DD
                IF parsed_date IS NULL THEN
                    BEGIN
                        parsed_date := TO_DATE(raw_val, 'YYYY-MM-DD');
                    EXCEPTION WHEN OTHERS THEN
                        NULL;
                    END;
                END IF;

                -- Persiste apenas datas válidas (NULL fica como está)
                IF parsed_date IS NOT NULL THEN
                    UPDATE contratos
                    SET vigencia_fim = parsed_date
                    WHERE id = rec.id;
                ELSE
                    RAISE WARNING
                        'vigencia_fim migration: data inválida ignorada. id=%, raw="%"',
                        rec.id, rec.vf;
                END IF;

            END LOOP;
        END;
        $$;
    """)


def downgrade() -> None:
    op.drop_index('ix_contratos_vigencia_fim', table_name='contratos')
    op.drop_column('contratos', 'vigencia_fim')
