const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const statusLabels = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  processing: 'En cours',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée'
};

module.exports = {
    
    generateOrderPDF: async (order, type = 'order') => {
        const doc = new PDFDocument({ margin: 50 });

        const dirPath = path.join(__dirname, '../tmp');
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath);
        }

        const fileName = `${type}_${order._id}.pdf`;
        const filePath = path.join(dirPath, fileName);

        doc.pipe(fs.createWriteStream(filePath));

        /*
         =========================
         HEADER
         =========================
        */
        doc
            .fontSize(22)
            .font('Helvetica-Bold')
            .text(order.items[0]?.storeId?.name || 'Ivanjo', { align: 'center' });


        doc.moveDown(0.5);

        doc
            .fontSize(16)
            .font('Helvetica')
            .text(type === 'order' ? 'BON DE COMMANDE' : 'BON DE RÉCEPTION', { align: 'center' });

        doc.moveDown(2);

        /*
         =========================
         INFOS COMMANDE / CLIENT
         =========================
        */
        doc.fontSize(12);
        doc.text(`Commande N°: ${order.orderNumber}`);
        doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
        doc.text(`Client: ${order.userId?.profile?.firstName} ${order.userId?.profile?.lastName}`);

        if (type === 'receipt') {
            doc.text(`Statut: ${statusLabels[order.status] || order.status}`);
            doc.text(`Date de réception: ${new Date().toLocaleDateString()}`);
        }

        doc.moveDown(1.5);

        /*
         =========================
         TABLE HEADER
         =========================
        */
        const tableTop = doc.y;

        doc.font('Helvetica-Bold');
        doc.text('Produit', 50, tableTop);
        doc.text('Qté', 300, tableTop);
        doc.text('Prix U.', 350, tableTop);
        doc.text('Total', 450, tableTop);

        doc.moveDown();
        doc.font('Helvetica');

        /*
         =========================
         TABLE ROWS
         =========================
        */
        let positionY = tableTop + 25;

        order.items.forEach(item => {
            doc.text(item.productName, 50, positionY);
            doc.text(String(item.quantity), 300, positionY);
            doc.text(Number(item.unitPrice).toFixed(2), 350, positionY);
            doc.text(Number(item.totalPrice).toFixed(2), 450, positionY);
            positionY += 20;
        });

        doc.moveDown(2);

        /*
         =========================
         TOTALS
         =========================
        */
        doc.font('Helvetica-Bold');
        doc.text(`Sous-total: ${Number(order.subtotal).toFixed(2)} Ar`, 350, positionY + 20, { align: 'right' });
        doc.text(`Taxes: ${Number(order.tax).toFixed(2)} Ar`, 350, positionY + 40, { align: 'right' });
        doc.text(`TOTAL: ${Number(order.total).toFixed(2)} Ar`, 350, positionY + 60, { align: 'right' });

        /*
         =========================
         FOOTER
         =========================
        */
        doc.moveDown(5);
        doc.fontSize(10).font('Helvetica');
        doc.text(type === 'order' 
            ? 'Merci pour votre commande.' 
            : 'Merci pour votre confiance, votre commande a bien été reçue.', 
            { align: 'center' });

        doc.end();

        return filePath;
    }
};
