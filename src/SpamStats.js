/**
 * Generates a page [[Special:Blankpage/SpamStats]] with statistics
 * about URLs blocked by [[MediaWiki:Spam-blacklist]]
 *
 * @author: Helder (https://github.com/he7d3r)
 * @license: CC BY-SA 3.0 <https://creativecommons.org/licenses/by-sa/3.0/>
 */
( function ( mw, $ ) {
	'use strict';

	/* Translatable strings */
	mw.messages.set( {
		'ss-title': 'Estatísticas do registro da lista negra de SPAMS',
		'ss-description': 'A tabela a seguir mostra o número de "tentativas de ' +
			'edição" em que cada URL estava presente. Note que o MediaWiki ' +
			'produz mais de um registro para a "mesma edição" caso o usuário ' +
			'simplesmente tente salvar a edição sem remover o link (ou se não ' +
			'remover todas as ocorrências do mesmo). Os números abaixo também ' +
			'não dizem quantos usuários distintos tentaram inserir um certo ' +
			'link, nem diz em quantas páginas distintas eles seriam inseridos.',
		'ss-table-caption': 'Registros por URL',
		'ss-prompt-text': 'Caso deseje filtrar a lista de registros de SPAM, ' +
			'digite o texto que deve estar presente nas URLs de interesse. ' +
			'Deixe em branco para analisar todos os registros.',
		'ss-processing': 'Verificando quais dos $1 registros anteriores a $2 contém "$3".'
	} );

	var batchSize = 'max',
		api,
		searchStr = prompt( mw.msg( 'ss-prompt-text' ), 'youtu' );
	function process( freq ) {
		var keys, $table;
		keys = Object.keys( freq );
		keys.sort( function ( a, b ) {
			return freq[ b ] - freq[ a ];
		} );
		$table = $( '<tbody></tbody>' )
			.append(
				$( '<tr></tr>' )
					.append(
						$( '<th>' ).text( 'Logs' ),
						$( '<th>' ).text( 'URL' )
					)
			);
		$.each( keys, function ( i, val ) {
			$table.append(
				$( '<tr></tr>' )
					.append(
						$( '<td>' ).text( freq[ val ] ),
						$( '<td>' ).text( val )
					)
			);
		} );
		$( '#mw-content-text' )
			.empty()
			.append(
					$( $( '<p></p>' ).text( mw.msg( 'ss-description' ) ) ),
					$( '<table class="wikitable sortable"></table>' )
						.append( $( '<caption>' ).text( mw.msg( 'ss-table-caption' ) ) )
						.append( $table )
						.tablesorter()
			);
		$( '#firstHeading' ).text( mw.msg( 'ss-title' ) );
	}
	function normalize( url ) {
		return url
			// Remove HTTP and HTTPS protocols
			.replace( /(^| )(?:https?:)?\/\//gi, '$1' );
	}
	function load() {
		var freq = {},
			param = {
				action: 'query',
				format: 'json',
				list: 'logevents',
				leprop: 'user|timestamp|comment|details|userid|parsedcomment|tags|ids',
				letype: 'spamblacklist',
				lelimit: batchSize,
				continue: ''
			},
			getLogBatch = function ( queryContinue ) {
				$.extend( param, queryContinue );
				api.get( param )
				.done( function ( data ) {
					$( '#mw-content-text' )
						.empty()
						.append(
							$( '<p></p>' ).text(
								mw.msg(
									'ss-processing',
									data.limits.logevents,
									data.query.logevents[ 0 ].timestamp,
									searchStr
								)
							)
						);
					$.each( data.query.logevents, function ( id, val ) {
						var urls = val.params.url.split( ' ' ),
							url, i;
						for ( i = 0; i < urls.length; i++ ) {
							url = urls[ i ];
							if ( !searchStr || url.indexOf( searchStr ) !== -1 ) {
								url = normalize( url );
								if ( freq[ url ] ) {
									freq[ url ]++;
								} else {
									freq[ url ] = 1;
								}
							}
						}
					} );
					if ( data.continue ) {
						getLogBatch( data.continue );
					} else {
						process( freq );
					}
				} );
			};
		api = new mw.Api();
		getLogBatch();
	}

	if ( mw.config.get( 'wgCanonicalSpecialPageName' ) === 'Blankpage'
		&& /\/SpamStats$/.test( mw.config.get( 'wgTitle' ) )
	) {
		$.when(
			mw.loader.using( [
				'mediawiki.api',
				'jquery.tablesorter'
			] ),
			$.ready
		).then( load );
	}

}( mediaWiki, jQuery ) );
