class CaixaDaguaCard extends HTMLElement {
  set hass(hass) {
    // Chaves necessárias para a configuração - Na verdade nem todas são necessarias.
    const requiredKeys = [
      'figure', 'table1', 'table2', 'show_title', 'title', 'subtitle'
    ];

    let config = {};

    // Função para obter o valor das propriedades de configuração
    const getValue = async (value) => {
      if (typeof value === 'number') {
        return value;
      } else if (!isNaN(parseFloat(value))) {
        return parseFloat(value);
      } else if (hass.states[value]) {
        return parseFloat(hass.states[value].state);
      } else if (typeof value === 'string' && value.includes('{{')) {
        const result = await hass.callApi('POST', 'template', { template: value });
        return parseFloat(result);
      } else {
        return 'N/A';  // Retorna 'N/A' se não encontrar valor válido
      }
    };

    // Função para popular a configuração com os valores obtidos
    const populateConfig = async () => {
      for (const key of requiredKeys) {
        if (key === 'figure') {
          config[key] = {
            'percentage_volume': await getValue(this._config[key]['percentage_volume']),
            'percentage_volume_label': await getValue(this._config[key]['percentage_volume_label']),
            'liters_label': await getValue(this._config[key]['liters_label'])
          };
        } else if (key === 'table1' || key === 'table2') {
          if (config[key] == undefined) {
            config[key] = {};
          }
          for (const subKey in this._config[key]) {
            config[key][subKey] = {
              state: await getValue(this._config[key][subKey].state),
              friendly_name: this._config[key][subKey].friendly_name,
              suffix: this._config[key][subKey].suffix || ''
            };
          }
        } else {
          config[key] = this._config[key];
        }
      }
      console.log(config);
    };

    // Chame a função para popular o config
    populateConfig();

    // Função principal para chamar populateConfig e atualizar os dados
    const main = async () => {
      await populateConfig();

      const percentualCaixaTotal = config.figure['percentage_volume'];
      let displayLabel = '';

      // Verifica qual label usar
      if (config.figure['liters_label'] !== undefined && config.figure['liters_label'] !== 'N/A') {
        displayLabel = `${config.figure['liters_label']}L`;
      } else {
        displayLabel = `${config.figure['percentage_volume']}%`;
      }

      const entityDisplay = [];
      if (config.table1) {
        for (const key in config.table1) {
          entityDisplay.push({
            key: key,
            state: config.table1[key].state,
            friendly_name: config.table1[key].friendly_name,
            suffix: config.table1[key].suffix
          });
        }
      }

      const entityDisplay2 = [];
      if (config.table2) {
        for (const key in config.table2) {
          entityDisplay2.push({
            key: key,
            state: config.table2[key].state,
            friendly_name: config.table2[key].friendly_name,
            suffix: config.table2[key].suffix
          });
        }
      }

      console.log(entityDisplay.length > 0 || entityDisplay2.length > 0);

      const updateData = () => {
        const now = new Date();
        const formattedDate = now.toLocaleString('pt-BR');

        let table = ``;
        if (entityDisplay.length > 0 || entityDisplay2.length > 0) {
          table = `
            <div class="table-responsive">
              <table class='table table-striped'>
                <thead class="thead-dark">
                  <tr>
                    <th>Entidade</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody id="entity-table">
                </tbody>
              </table>
            </div>
          `;
        }

        let name = ``;
        if (config.show_title) {
          name = `<h2>${config.title}</h2>
            <p class="titulo">${config.subtitle}</p>`;
        }

        let css = `
          body {
            background-color: var(--card-background-color);
            color: white;
          }
          h2 {
            margin-top: 20px;
            font-size: 36px;
            text-align: center;
          }
          p.titulo {
            text-align: center;
            font-size: 18px;
          }
          p.atualizacao {
            text-align: right;
            max-width: 100%;
            margin: 15px auto 0 auto;
            font-size: 12px;
          }
          .table-responsive {
            max-width: 100%;
            margin: 0 auto;
            border: 1px solid #dfdfdf;
          }
          table {
            margin-bottom: 0 !important;
          }
          tr, td {
            color: white;
          }
          td:first-child, th:first-child {
            text-align: right;
            width: 75%;
          }
          td:nth-child(2), th:nth-child(2) {
            text-align: left;
            width: 25%;
          }
          .tank {
            margin: 20px auto 10px auto;
            width: calc(100% - 25px);
            max-width: 200px;
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
          }
          .tampa {
            width: 115%;
            position: absolute;
            background-color: #ddd;
            height: 6px;
            border-radius: 2px;
            left: 51.5%;
            transform: translateX(-50%);
            top: 0;
            margin: 0 auto;
          }
          .water-tank-wrapper {
            width: 100%;
            position: relative;
            margin: 15px auto 0;
            padding-bottom: calc(100% * ${this._config.height_ratio || 100} / 100);
            margin-top: 5px;
          }
          .water-tank {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: 2px solid black;
            border-radius: 4px;
            overflow: hidden;
            background-color: #ddd;
            transform: perspective(500px) rotateX(-35deg);
          }
          .water-level {
            position: absolute;
            bottom: 0;
            background-color: #0094FF;
            width: 100%;
            transition: height 0.5s;
          }
          .water-label {
            position: absolute;
            bottom: 50%;
            width: 100%;
            text-align: center;
            font-weight: bold;
            font-size: ${this._config.label_size}px;
            color: white;
            transform: translateY(50%);
          }
          p.titulo-figura {
            color: #0094FF;
            text-align: center;
          }
          .sub_table {
            margin-top: 10px;
          }
          .table-responsive {
            display: block;
            width: 100%;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .table {
            width: 100%;
            margin-bottom: 1rem;
            color: #212529;
            border-collapse: collapse;
          }
          .table th, .table td {
            padding: 0.75rem;
            vertical-align: top;
            border-top: 1px solid #dee2e6;
          }
          .table thead th {
            vertical-align: bottom;
            border-bottom: 2px solid #dee2e6;
          }
          .table tbody + tbody {
            border-top: 2px solid #dee2e6;
          }
          .table-striped tbody tr:nth-of-type(odd) {
            background-color: rgba(0, 0, 0, 0.05);
          }
          .thead-dark th {
            color: #fff;
            background-color: #343a40;
            border-color: #454d55;
          }
          @media (max-width: 768px) {
            h2 {
              font-size: clamp(18px, 5vw, 24px);
              margin-top: min(20px, 3vh);
            }
            p.titulo {
              font-size: clamp(14px, 4vw, 16px);
            }
            .water-label {
              font-size: clamp(24px, 6vw, 32px);
            }
          }
          @media (max-width: 300px) {
            .tank {
              max-width: 150px;
            }
            
            .tampa {
              width: 110%;
            }
            
            .water-label {
              font-size: calc(${this._config.label_size}px * 0.75);
            }
          }
        `;

        let html = `
          <style>
            ${css}
          </style>
          <div>
            ${name}
            <div class="tank">
              <div class="tampa"></div>
              <div class="water-tank-wrapper">
                <div class="water-tank">
                  <div id="water" class="water-level" style="height: 0;"></div>
                  <span id="water-label" class="water-label">0</span>
                </div>
              </div>
            </div>
            ${table}
            <!-- <p class="atualizacao">Atualizado em: ${formattedDate}</p> -->
          </div>
        `;

        this.innerHTML = html;

        if (entityDisplay.length > 0 || entityDisplay2.length > 0) {
          const updateTable = (entityTable, entityDisplay, fontsize) => {
            for (const { state, friendly_name, suffix } of entityDisplay) {
              let value = state !== 'N/A' ? `${state}${suffix}` : 'N/A';
              if (fontsize) {
                entityTable.innerHTML += `<tr><td style='font-size: 12px; color: #dfdfdf'>${friendly_name}</td><td style='font-size: 12px; color: #dfdfdf'>${value}</td></tr>`;
              } else {
                entityTable.innerHTML += `<tr><td>${friendly_name}</td><td>${value}</td></tr>`;
              }
            }
          };

          const entityTable = this.querySelector(`#entity-table`);
          entityTable.innerHTML = '';

          updateTable(entityTable, entityDisplay, false);
          updateTable(entityTable, entityDisplay2, true);
        }

        this.querySelector('#water').style.height = `${percentualCaixaTotal}%`;
        this.querySelector('#water-label').innerText = displayLabel;
      };

      updateData();

      console.log('Configuração populada.');
    };

    // Chame a função principal
    main();
  }

  setConfig(config) {
    const requiredKeys = [
      'figure'
    ];

    // Verifica se todas as chaves necessárias estão presentes em config
    for (const key of requiredKeys) {
      if (!(key in config)) {
        throw new Error('Configuração inválida');
      }
    }

    // Define valores padrão
    this._config = {
      height_ratio: 100,
      label_size: 32, // Tamanho padrão da fonte
      ...config
    };
  }

  getCardSize() {
    return 3;
  }
}

// Define o custom element
customElements.define('caixadagua-card', CaixaDaguaCard);
